import { generateText, stepCountIs, type ToolSet } from "ai"
import { and, eq, sql } from "drizzle-orm"
import { z } from "zod"
import { agentRuns, runSteps, runTranscripts } from "@mesh/db"
import { getDb } from "../db"
import { broadcast } from "../realtime"
import type { AgentRow } from "../runner/context"
import { resolveAgentCheapModel, resolveAgentModel } from "../runner/llm"
import { toAuditedTools, type ToolSpec } from "../tools/audited"

export const MAX_CONCURRENT_SUBAGENTS = 4
export const MAX_TOTAL_SUBAGENTS = 12

export const spawnSubagentSchema = z.object({
  task: z.string().min(1).describe("Clear, self-contained task description for the subagent"),
  tools: z
    .enum(["read_only", "same"])
    .default("read_only")
    .describe("Tool permissions: 'read_only' (recommended) or 'same' as parent"),
  model: z
    .enum(["cheap", "same"])
    .default("cheap")
    .describe("Model choice: 'cheap' (recommended for reading/research) or 'same' as parent"),
  maxSteps: z
    .number()
    .int()
    .min(1)
    .max(30)
    .default(10)
    .optional()
    .describe("Maximum steps for the subagent (default 10)"),
})

export type SpawnSubagentInput = z.infer<typeof spawnSubagentSchema>

export const READ_ONLY_TOOL_NAMES = new Set([
  "fs_read",
  "fs_glob",
  "fs_grep",
  "git_status",
  "git_diff",
  "web_search",
  "canvas_read",
  "recall",
])

export interface SpawnSubagentToolArgs {
  parentRunId: string
  roomId: string
  orgId: string
  agent: AgentRow
  availableToolSpecs?: ToolSpec[]
  scrub?: (s: string) => string
}

export function spawnSubagentTool(args: SpawnSubagentToolArgs): ToolSpec {
  return {
    name: "spawn_subagent",
    description:
      "Spawns a child subagent to perform focused background reading, research, or evaluation. Returns only the final summary to keep context concise.",
    schema: spawnSubagentSchema,
    dangerous: false,
    execute: async (input: SpawnSubagentInput, signal?: AbortSignal) => {
      const db = getDb()

      // 1. Check fan-out concurrency and total limits
      const [counts] = await db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(*) filter (where ${agentRuns.status} = 'running')`,
        })
        .from(agentRuns)
        .where(eq(agentRuns.parentRunId, args.parentRunId))

      const total = Number(counts?.total ?? 0)
      const active = Number(counts?.active ?? 0)

      if (active >= MAX_CONCURRENT_SUBAGENTS) {
        throw new Error(
          `Subagent concurrency limit reached (${active}/${MAX_CONCURRENT_SUBAGENTS} running). Wait for existing subagents to finish.`,
        )
      }
      if (total >= MAX_TOTAL_SUBAGENTS) {
        throw new Error(
          `Total subagent limit reached for this run (${total}/${MAX_TOTAL_SUBAGENTS}). No more subagents can be spawned.`,
        )
      }

      // 2. Insert child agent_runs row
      const [childRun] = await db
        .insert(agentRuns)
        .values({
          roomId: args.roomId,
          agentId: args.agent.id,
          step: 0,
          role: "responder",
          status: "running",
          engine: "v2",
          parentRunId: args.parentRunId,
          heartbeatAt: new Date(),
          steps: 0,
        })
        .returning()

      if (!childRun) {
        throw new Error("Failed to create child run for subagent")
      }

      // 3. Initialize child transcript
      await db.insert(runTranscripts).values({
        runId: childRun.id,
        messages: [],
        compactedThroughIdx: 0,
        plan: null,
        version: 1,
      })

      broadcast(args.roomId, {
        type: "run.step",
        runId: args.parentRunId,
        step: 0,
        kind: "tool",
        label: `Spawned subagent: "${input.task.slice(0, 50)}"`,
      })

      // 4. Resolve subagent model
      const resolved =
        input.model === "same"
          ? await resolveAgentModel(args.agent)
          : await resolveAgentCheapModel(args.agent)

      // 5. Filter available tools
      const allowedSpecs = (args.availableToolSpecs ?? []).filter((spec) => {
        if (spec.name === "spawn_subagent") return false // Prevent recursive spawn
        if (input.tools === "read_only") {
          return READ_ONLY_TOOL_NAMES.has(spec.name)
        }
        return true
      })

      const childTools: ToolSet = toAuditedTools(allowedSpecs, {
        orgId: args.orgId,
        roomId: args.roomId,
        agentId: args.agent.id,
        runId: childRun.id,
        messageId: "",
        scrub: args.scrub,
      })

      const maxSteps = input.maxSteps ?? 10
      let error: string | null = null

      try {
        const result = await generateText({
          model: resolved.model,
          system: [
            `You are a focused subagent assisting agent @${args.agent.handle}.`,
            `Role: Complete this specific delegated subtask and return a clear, concise summary of findings/results.`,
            `Task: ${input.task}`,
          ].join("\n"),
          prompt: input.task,
          tools: childTools,
          stopWhen: stepCountIs(maxSteps),
          abortSignal: signal,
        })

        // Persist steps
        let idx = 0
        for (const step of result.steps) {
          idx += 1
          await db
            .insert(runSteps)
            .values({
              runId: childRun.id,
              idx,
              kind: step.toolCalls && step.toolCalls.length > 0 ? "tool" : "model",
              inputRef: null,
              output: {
                text: step.text,
                toolCalls: step.toolCalls,
                toolResults: step.toolResults,
                finishReason: step.finishReason,
              },
              usage: step.usage,
              startedAt: new Date(),
              finishedAt: new Date(),
            })
            .catch(() => {})
        }

        await db
          .update(agentRuns)
          .set({
            status: "complete",
            finishReason: result.finishReason,
            steps: idx,
            inputTokens: result.usage?.inputTokens ?? null,
            outputTokens: result.usage?.outputTokens ?? null,
            heartbeatAt: new Date(),
          })
          .where(eq(agentRuns.id, childRun.id))

        broadcast(args.roomId, {
          type: "run.step",
          runId: args.parentRunId,
          step: 0,
          kind: "tool",
          label: `Subagent completed (${idx} steps)`,
        })

        return {
          status: "complete",
          task: input.task,
          stepsTaken: idx,
          summary: result.text || "Subagent finished with no textual output.",
        }
      } catch (err) {
        error = err instanceof Error ? err.message : String(err)
        await db
          .update(agentRuns)
          .set({
            status: "error",
            error,
            heartbeatAt: new Date(),
          })
          .where(eq(agentRuns.id, childRun.id))

        broadcast(args.roomId, {
          type: "run.step",
          runId: args.parentRunId,
          step: 0,
          kind: "tool",
          label: `Subagent error: ${error.slice(0, 40)}`,
        })

        throw new Error(`Subagent failed: ${error}`)
      }
    },
  }
}
