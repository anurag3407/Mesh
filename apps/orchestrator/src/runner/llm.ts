import { computeCostUsd, createRunScrubber, redactSecrets, type TurnRole } from "@mesh/core"
import { agentRuns, messages, modelPricing, providerKeys, tasks, usageEvents } from "@mesh/db"
import { createLanguageModel, devModelConfig, providerKeyToApiKey } from "@mesh/llm"
import type { LanguageModel, LanguageModelUsage, ToolSet } from "ai"
import { and, eq, sql } from "drizzle-orm"
import { registerRun, unregisterRun } from "../active-runs"
import { getDb } from "../db"
import { getEnv } from "../env"
import { broadcast } from "../realtime"
import { buildTools } from "../tools"
import type { AgentRow, MessageRow, RoomRow } from "./context"
import {
  buildSystemPrompt,
  buildUserPrompt,
  loadCanvasContext,
  loadConversation,
  loadTaskBriefContext,
  loadTaskContext,
  renderTranscript,
} from "./context"
import { streamAgentText } from "./stream-agent"

export interface RunLlmTurnArgs {
  room: RoomRow
  agent: AgentRow
  sessionId: string
  threadRootId: string | null
  trigger: MessageRow
  role: TurnRole
  step: number
  taskId?: string | null
}

export interface TurnResult {
  messageId: string
  runId: string
  content: string
  error: string | null
  aborted: boolean
}

interface ResolvedModel {
  model: LanguageModel
  provider: string
  modelName: string
  apiKey?: string
}

export async function resolveAgentModel(agent: AgentRow): Promise<ResolvedModel> {
  const db = getDb()
  if (agent.providerKeyId) {
    const [key] = await db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.id, agent.providerKeyId))
      .limit(1)
    if (!key) throw new Error(`Provider key for @${agent.handle} was deleted`)
    if (!agent.model) throw new Error(`@${agent.handle} has no model configured`)
    const apiKey = providerKeyToApiKey(key, getEnv().MESH_KEK)
    return {
      model: createLanguageModel({
        provider: key.provider,
        apiKey,
        model: agent.model,
        baseUrl: key.baseUrl,
      }),
      provider: key.provider,
      modelName: agent.model,
      apiKey,
    }
  }
  const dev = devModelConfig()
  if (!dev) {
    throw new Error(
      `@${agent.handle} has no API key yet. A workspace admin can add one in Settings, then choose it on the Agents page.`,
    )
  }
  const modelName = agent.model ?? dev.model
  return {
    model: createLanguageModel({ ...dev, model: modelName }),
    provider: dev.provider,
    modelName,
  }
}

function numericParam(params: Record<string, unknown>, key: string, fallback?: number) {
  const value = params[key]
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

/**
 * Runs one LLM turn end to end: context, tools, streamed deltas, partial
 * persistence, final redaction, usage accounting and run status.
 */
export async function runLlmTurn(args: RunLlmTurnArgs): Promise<TurnResult> {
  const db = getDb()
  const { room, agent } = args
  const resolved = await resolveAgentModel(agent)

  const conversation = await loadConversation({
    roomId: room.id,
    threadRootId: args.threadRootId,
  })
  const transcript = renderTranscript(conversation)
  const [canvasContext, taskContext, taskBrief] = await Promise.all([
    loadCanvasContext(room.id),
    loadTaskContext(room.id),
    args.taskId ? loadTaskBriefContext(args.taskId) : Promise.resolve(""),
  ])
  const system = buildSystemPrompt({ room, agent, role: args.role })
  const prompt = buildUserPrompt({
    transcript,
    canvases: canvasContext,
    tasks: taskContext,
    agent,
    extra: taskBrief || undefined,
  })

  const [run] = await db
    .insert(agentRuns)
    .values({
      sessionId: args.sessionId,
      roomId: room.id,
      agentId: agent.id,
      step: args.step,
      role: args.role,
      status: "running",
      taskId: args.taskId ?? null,
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
      metadata: { agentName: agent.displayName, agentHandle: agent.handle, role: args.role },
    })
    .returning()
  if (!message) throw new Error("failed to create agent message")
  await db.update(agentRuns).set({ messageId: message.id }).where(eq(agentRuns.id, run.id))

  const controller = registerRun(run.id, room.id)

  const scrubPlaintexts = [resolved.apiKey].filter(Boolean) as string[]
  const runScrubber = createRunScrubber(scrubPlaintexts)

  let tools: ToolSet = {}
  let closeTools = async () => {}
  const warnings: string[] = []

  let buffer = ""
  let seq = 0
  let fullRaw = ""
  let lastBroadcast = 0
  let lastPersist = 0
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
  const startedAt = Date.now()

  const finalize = async () => {
    flush()
    const redacted = redactSecrets(runScrubber(fullRaw)).text
    const status = aborted ? "halted" : error ? "error" : "complete"
    const safeError = error ? redactSecrets(runScrubber(error)).text : null
    const safeWarnings = warnings.map((warning) => redactSecrets(runScrubber(warning)).text)
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
        costUsd: cost,
        ttftMs,
        latencyMs,
      })
    }

    await db
      .update(agentRuns)
      .set({
        status: aborted ? "halted" : error ? "error" : "complete",
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
        `Tools unavailable for this turn: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
      )
    }

    const params = agent.params ?? {}
    const result = await streamAgentText({
      model: resolved.model,
      system,
      prompt,
      tools,
      abortSignal: controller.signal,
      maxSteps: numericParam(params, "maxSteps", 6),
      temperature: numericParam(params, "temperature"),
      topP: numericParam(params, "topP"),
      maxOutputTokens: numericParam(params, "maxOutputTokens"),
      onDelta: async (delta) => {
        fullRaw += delta
        buffer += delta
        const now = Date.now()
        if (now - lastBroadcast >= 40) {
          lastBroadcast = now
          flush()
        }
        if (now - lastPersist >= 1_000) {
          lastPersist = now
          await getDb()
            .update(messages)
            .set({ content: redactSecrets(fullRaw).text })
            .where(eq(messages.id, message.id))
            .catch((persistError) => console.error("[runner] partial persist failed", persistError))
        }
      },
    })
    usage = result.usage
    ttftMs = result.ttftMs
    latencyMs = result.latencyMs
    aborted = result.aborted
    error = result.error
  } catch (streamError) {
    aborted = controller.signal.aborted
    error = aborted
      ? null
      : streamError instanceof Error
        ? streamError.message
        : String(streamError)
    latencyMs = Date.now() - startedAt
  } finally {
    unregisterRun(run.id)
    await closeTools().catch(() => {})
  }

  const content = await finalize()
  return {
    messageId: message.id,
    runId: run.id,
    content,
    error: error ? redactSecrets(error).text : null,
    aborted,
  }
}
