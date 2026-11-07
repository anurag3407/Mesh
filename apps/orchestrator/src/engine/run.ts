import {
  computeCostUsd,
  createRunScrubber,
  parseCapabilities,
  redactSecrets,
} from "@mesh/core"
import {
  agentRuns,
  messages,
  modelPricing,
  runSteps,
  runTranscripts,
  tasks,
  usageEvents,
} from "@mesh/db"
import { buildProviderOptions } from "@mesh/llm"
import {
  stepCountIs,
  streamText,
  type LanguageModelUsage,
  type ToolSet,
} from "ai"
import { and, eq, sql } from "drizzle-orm"
import { consumeRunInterrupts, registerRun, unregisterRun } from "../active-runs"
import { ComputerClient } from "../computer/client"
import { getDb } from "../db"
import { getMemoryService } from "../memory/service"
import { broadcast } from "../realtime"
import {
  loadCanvasContext,
  loadConversation,
  loadTaskBriefContext,
  loadTaskContext,
  type ContextMessage,
} from "../runner/context"
import {
  resolveAgentModel,
  resolveEffortLevel,
  type RunLlmTurnArgs,
  type TurnResult,
} from "../runner/llm"
import { buildTools } from "../tools"
import { buildEngineContext, sortToolSpecs } from "./context"
import { getAvailableSkills } from "./skills"
import { getVerifyMode, runCriticVerification } from "./verify"

function numericParam(
  params: Record<string, unknown> | null | undefined,
  key: string,
  fallback?: number,
): number | undefined {
  if (!params) return fallback
  const value = params[key]
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

/**
 * Runs one Engine v2 turn:
 * - Structured prefix caching via buildEngineContext
 * - Step-by-step durable execution with run_steps & run_transcripts persistence
 * - 10-second heartbeat on agent_runs.heartbeat_at
 * - Realtime run events (run.step, run.status)
 * - Provider capability integration (Anthropic caching, providerOptions)
 */
export async function runEngineTurn(args: RunLlmTurnArgs): Promise<TurnResult> {
  const db = getDb()
  const { room, agent } = args
  const resolved = await resolveAgentModel(agent)

  const conversation: ContextMessage[] = await loadConversation({
    roomId: room.id,
    threadRootId: args.threadRootId,
  })

  const [canvasContext, taskContext, taskBrief] = await Promise.all([
    loadCanvasContext(room.id),
    loadTaskContext(room.id),
    args.taskId ? loadTaskBriefContext(args.taskId) : Promise.resolve(""),
  ])

  const maxSteps = numericParam(agent.params as Record<string, unknown>, "maxSteps", 60) ?? 60

  const [run] = await db
    .insert(agentRuns)
    .values({
      sessionId: args.sessionId,
      roomId: room.id,
      agentId: agent.id,
      step: args.step,
      role: args.role,
      status: "running",
      engine: "v2",
      heartbeatAt: new Date(),
      parentRunId: null,
      taskId: args.taskId ?? null,
      steps: 0,
    })
    .returning()
  if (!run) throw new Error("failed to create agent run")

  const [message] = await db
    .insert(messages)
    .values({
      roomId: room.id,
      threadRootId: args.threadRootId,
      senderType: "agent",
      senderId: agent.id,
      content: "",
      status: "streaming",
      mentions: [],
      runId: run.id,
      metadata: {
        agentName: agent.displayName,
        agentHandle: agent.handle,
        role: args.role,
        engine: "v2",
      },
    })
    .returning()
  if (!message) throw new Error("failed to create agent message")

  await db.update(agentRuns).set({ messageId: message.id }).where(eq(agentRuns.id, run.id))

  // Initialize run_transcripts row
  await db.insert(runTranscripts).values({
    runId: run.id,
    messages: [],
    compactedThroughIdx: 0,
    plan: null,
    version: 1,
  })

  const controller = registerRun(run.id, room.id, { agentId: agent.id, engine: "v2" })

  // Start 10-second heartbeat updater
  const heartbeatTimer = setInterval(() => {
    db.update(agentRuns)
      .set({ heartbeatAt: new Date() })
      .where(eq(agentRuns.id, run.id))
      .catch(() => {})
  }, 10_000)

  const scrubPlaintexts = [resolved.apiKey].filter(Boolean) as string[]
  const runScrubber = createRunScrubber(scrubPlaintexts)

  let tools: ToolSet = {}
  let closeTools = async () => {}
  const warnings: string[] = []

  let buffer = ""
  let seq = 0
  let fullRaw = ""
  let chain = Promise.resolve()
  const send = (event: Parameters<typeof broadcast>[1]) => {
    chain = chain.then(() => broadcast(room.id, event)).catch(() => {})
  }
  const flush = () => {
    if (!buffer) return
    const { text } = redactSecrets(runScrubber(buffer))
    buffer = ""
    if (text) send({ type: "message.delta", messageId: message.id, seq: seq++, delta: text })
  }

  let usage: LanguageModelUsage | null = null
  let ttftMs: number | null = null
  let latencyMs = 0
  let error: string | null = null
  let aborted = false
  let finishReason: string | null = null
  let stepsCompleted = 0
  const startedAt = Date.now()

  const finalize = async () => {
    clearInterval(heartbeatTimer)
    unregisterRun(run.id)
    flush()
    const redacted = redactSecrets(runScrubber(fullRaw)).text
    const status = aborted ? "halted" : error ? "error" : "complete"
    const safeError = error ? redactSecrets(runScrubber(error)).text : null
    const safeWarnings = warnings.map((w) => redactSecrets(runScrubber(w)).text)
    const metadata = {
      ...(message.metadata as Record<string, unknown>),
      ...(safeError ? { error: safeError } : {}),
      ...(aborted ? { stopped: true } : {}),
      ...(safeWarnings.length ? { warnings: safeWarnings } : {}),
    }

    await db
      .update(messages)
      .set({ content: redacted, status, metadata })
      .where(eq(messages.id, message.id))

    let cost = 0
    if (usage) {
      const [price] = await db
        .select()
        .from(modelPricing)
        .where(
          and(
            eq(modelPricing.provider, resolved.provider),
            eq(modelPricing.model, resolved.modelName),
          ),
        )
        .limit(1)

      cost = computeCostUsd(
        { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
        price,
      )

      await db.insert(usageEvents).values({
        orgId: room.orgId,
        roomId: room.id,
        agentId: agent.id,
        provider: resolved.provider,
        model: resolved.modelName,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        cachedInputTokens: (usage as Record<string, unknown>).cachedInputTokens as number | undefined ?? 0,
        costUsd: cost,
        ttftMs,
        latencyMs,
      })
    }

    await db
      .update(agentRuns)
      .set({
        status: aborted ? "halted" : error ? "error" : "complete",
        finishReason: aborted ? "abort" : error ? "error" : (finishReason ?? "stop"),
        steps: stepsCompleted,
        engine: "v2",
        heartbeatAt: new Date(),
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        costUsd: cost,
        ttftMs,
        latencyMs,
        error: safeError,
      })
      .where(eq(agentRuns.id, run.id))

    if (args.taskId) {
      await db
        .update(tasks)
        .set({
          turnsUsed: sql`turns_used + 1`,
          costUsd: sql`cost_usd + ${cost}`,
        })
        .where(eq(tasks.id, args.taskId))
    }

    send({ type: "message.done", messageId: message.id, status })
    await chain

    // WS2 M5: Post-run automatic memory extraction pass
    if (fullRaw && !aborted && !error) {
      try {
        const memoryService = getMemoryService()
        await memoryService.extractMemoriesFromTranscript({
          orgId: room.orgId,
          roomId: room.id,
          agentId: agent.id,
          transcriptText: fullRaw,
          agent,
        })
      } catch {}
    }

    return redacted
  }

  try {
    try {
      const built = await buildTools({
        roomId: room.id,
        orgId: room.orgId,
        agent,
        runtime: {
          orgId: room.orgId,
          roomId: room.id,
          agentId: agent.id,
          runId: run.id,
          messageId: message.id,
          scrub: runScrubber,
        },
      })
      tools = built.tools
      closeTools = built.close
      warnings.push(...built.warnings)
    } catch (toolError) {
      warnings.push(
        `Tool init error: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
      )
    }

    // Pre-turn memory recall & pinned digest (WS2 M4)
    let pinnedMemories: Array<{ id: string; title: string; body: string }> = []
    let recalledMemories: Array<{ id: string; title: string; body: string; scope?: string }> = []
    try {
      const memoryService = getMemoryService()
      pinnedMemories = await memoryService.getPinnedDigest({
        orgId: room.orgId,
        agentId: agent.id,
        roomId: room.id,
      })

      const recallQuery = [args.trigger.content, taskBrief].filter(Boolean).join(" ").slice(0, 500)
      const recalled = await memoryService.recall({
        orgId: room.orgId,
        query: recallQuery,
        agentId: agent.id,
        roomId: room.id,
        limit: 8,
      })
      recalledMemories = recalled.map((m) => ({
        id: m.id,
        title: m.title,
        body: m.body,
        scope: m.scope,
      }))

      // WS2 M8: Mirror durable memory into /home/bot/.saaya/memory/ for bots with computers
      const agentCaps = parseCapabilities(agent.capabilities)
      if (agentCaps.computer) {
        try {
          const { memoryMd, topics } = await memoryService.generateMemoryMirror({
            orgId: room.orgId,
            agentId: agent.id,
            roomId: room.id,
          })
          const compClient = new ComputerClient()
          await compClient.writeFile(agent.id, {
            path: "/home/bot/.saaya/memory/MEMORY.md",
            content: memoryMd,
          })
          for (const [tag, topicContent] of Object.entries(topics)) {
            const safeTag = tag.replace(/[^a-zA-Z0-9_-]/g, "_")
            await compClient.writeFile(agent.id, {
              path: `/home/bot/.saaya/memory/topics/${safeTag}.md`,
              content: topicContent,
            })
          }
        } catch {}
      }
    } catch {}

    // Load available skills for the org
    let skillsIndex: Array<{ slug: string; description: string }> = []
    try {
      skillsIndex = await getAvailableSkills(room.orgId)
    } catch {}

    // Build structured context
    const initialContext = buildEngineContext({
      agent,
      room,
      provider: resolved.provider,
      role: args.role,
      skillsIndex,
      pinnedMemories,
      roomHistory: conversation,
      volatileTail: {
        now: new Date(),
        recalledMemories,
        activeTaskBrief: taskBrief || undefined,
        currentTrigger: args.trigger.content,
      },
    })

    const configuredEffort = (agent.params as Record<string, unknown>)?.effort as string | undefined
    const effort = resolveEffortLevel({
      configuredEffort,
      hasTask: Boolean(args.taskId),
    })
    const providerOptions = buildProviderOptions({
      provider: resolved.provider as any,
      effort,
    })

    send({ type: "run.status", runId: run.id, status: "thinking" })

    let stepIdx = 0
    let stepStartTime = Date.now()

    const streamResult = streamText({
      model: resolved.model,
      messages: initialContext.messages,
      tools,
      abortSignal: controller.signal,
      stopWhen: stepCountIs(maxSteps),
      ...(Object.keys(providerOptions).length > 0 ? { providerOptions: providerOptions as any } : {}),
      ...(numericParam(agent.params as Record<string, unknown>, "temperature") !== undefined
        ? { temperature: numericParam(agent.params as Record<string, unknown>, "temperature") }
        : {}),
      ...(numericParam(agent.params as Record<string, unknown>, "topP") !== undefined
        ? { topP: numericParam(agent.params as Record<string, unknown>, "topP") }
        : {}),
      ...(numericParam(agent.params as Record<string, unknown>, "maxOutputTokens") !== undefined
        ? { maxOutputTokens: numericParam(agent.params as Record<string, unknown>, "maxOutputTokens") }
        : {}),
      onStepEnd: async (step) => {
        stepIdx += 1
        stepsCompleted = stepIdx
        const isToolStep = step.toolCalls && step.toolCalls.length > 0
        const kind = isToolStep ? "tool" : "model"

        // Persist to run_steps
        try {
          await db.insert(runSteps).values({
            runId: run.id,
            idx: stepIdx,
            kind,
            inputRef: null,
            output: {
              text: step.text,
              toolCalls: step.toolCalls,
              toolResults: step.toolResults,
              finishReason: step.finishReason,
            },
            usage: step.usage,
            startedAt: new Date(stepStartTime),
            finishedAt: new Date(),
          })

          // Append to run_transcripts
          await db
            .update(runTranscripts)
            .set({
              updatedAt: new Date(),
              version: sql`version + 1`,
            })
            .where(eq(runTranscripts.runId, run.id))

          await db
            .update(agentRuns)
            .set({
              steps: stepIdx,
              heartbeatAt: new Date(),
            })
            .where(eq(agentRuns.id, run.id))
        } catch {}

        send({
          type: "run.step",
          runId: run.id,
          step: stepIdx,
          kind,
          label: isToolStep
            ? `Running ${step.toolCalls.map((t) => t.toolName).join(", ")}`
            : "Generating response",
        })

        if (isToolStep) {
          send({ type: "run.status", runId: run.id, status: "tool" })
        } else {
          send({ type: "run.status", runId: run.id, status: "thinking" })
        }

        // Mid-run steering: check if human messages arrived targeting this agent
        const pending = consumeRunInterrupts(run.id)
        if (pending.length > 0) {
          for (const item of pending) {
            send({
              type: "run.step",
              runId: run.id,
              step: stepIdx,
              kind: "model",
              label: `Steered: "${item.content.slice(0, 45)}"`,
            })
          }
        }

        stepStartTime = Date.now()
      },
    })

    for await (const delta of streamResult.textStream) {
      if (ttftMs === null) ttftMs = Date.now() - startedAt
      buffer += delta
      fullRaw += delta
      if (buffer.length > 80 || Date.now() - startedAt > 200) {
        flush()
      }
    }

    const [finalUsage, finalReason] = await Promise.all([
      streamResult.usage,
      streamResult.finishReason,
    ])
    usage = finalUsage
    finishReason = finalReason
    latencyMs = Date.now() - startedAt

    // Verification step (WS1 E10): critic verification if configured and not aborted
    const verifyMode = getVerifyMode(agent.params as Record<string, unknown> | null)
    if (
      verifyMode === "critic" &&
      taskBrief &&
      fullRaw &&
      !controller.signal.aborted
    ) {
      send({ type: "run.status", runId: run.id, status: "thinking" })
      send({
        type: "run.step",
        runId: run.id,
        step: stepIdx + 1,
        kind: "tool",
        label: "Running critic verification against task requirements",
      })
      const review = await runCriticVerification({
        agent,
        orgId: room.orgId,
        roomId: room.id,
        taskBrief,
        proposedOutput: fullRaw,
        cycle: 0,
      })
      if (!review.pass && review.feedback) {
        warnings.push(`Critic feedback: ${review.feedback}`)
      }
    }
  } catch (err) {
    if (controller.signal.aborted || (err instanceof Error && err.name === "AbortError")) {
      aborted = true
    } else {
      error = err instanceof Error ? err.message : String(err)
    }
  } finally {
    try {
      await closeTools()
    } catch {}
  }

  const finalContent = await finalize()
  return {
    runId: run.id,
    messageId: message.id,
    content: finalContent,
    error,
    aborted,
  }
}
