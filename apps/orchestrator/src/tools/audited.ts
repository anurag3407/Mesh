import { redactSecrets } from "@mesh/core"
import { toolCalls } from "@mesh/db"
import { tool, type ToolSet } from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { getDb } from "../db"
import { broadcast } from "../realtime"
import { resolveApprovalWaiter, waitForApproval } from "./approvals"

export interface ToolRuntime {
  orgId: string
  roomId: string
  agentId: string
  runId: string
  messageId: string
  approvalTimeoutMs?: number
}

export interface ToolSpec {
  name: string
  description: string
  schema: z.ZodType
  dangerous: boolean | ((args: Record<string, unknown>) => boolean)
  execute: (args: any, signal?: AbortSignal) => Promise<unknown>
}

const STORED_RESULT_LIMIT = 120_000

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]"
  if (typeof value === "string") return redactSecrets(value).text
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1))
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redactValue(v, depth + 1)]),
    )
  }
  return value
}

function forStorage(value: unknown): unknown {
  const redacted = redactValue(value)
  let json: string
  try {
    json = JSON.stringify(redacted) ?? "null"
  } catch {
    return { error: "tool result could not be serialised" }
  }
  if (json.length <= STORED_RESULT_LIMIT) return redacted
  return { truncated: true, preview: json.slice(0, 10_000) }
}

function isDangerous(spec: ToolSpec, args: Record<string, unknown>): boolean {
  return typeof spec.dangerous === "function" ? spec.dangerous(args) : spec.dangerous
}

/**
 * Runs every tool through one path: persist the call, ask a human when the tool
 * is dangerous, execute, persist the result, and return something the model can
 * consume. Failures become tool results instead of killing the stream.
 */
export function toAuditedTools(specs: ToolSpec[], runtime: ToolRuntime): ToolSet {
  const tools: ToolSet = {}
  for (const spec of specs) {
    tools[spec.name] = tool({
      description: spec.description,
      inputSchema: spec.schema,
      execute: async (args: unknown, options) => {
        const input = (args ?? {}) as Record<string, unknown>
        const dangerous = isDangerous(spec, input)
        const storedArgs = forStorage(input)
        const [row] = await getDb()
          .insert(toolCalls)
          .values({
            runId: runtime.runId,
            roomId: runtime.roomId,
            messageId: runtime.messageId,
            toolName: spec.name,
            args: storedArgs as Record<string, unknown>,
            status: dangerous ? "pending_approval" : "running",
          })
          .returning({ id: toolCalls.id })
        if (!row) throw new Error("failed to record tool call")

        if (dangerous) {
          await broadcast(runtime.roomId, {
            type: "tool.approval_requested",
            toolCallId: row.id,
            agentId: runtime.agentId,
            toolName: spec.name,
            args: storedArgs,
          })
          const signal = options.abortSignal
          const decision = await Promise.race([
            waitForApproval(row.id, runtime.approvalTimeoutMs),
            new Promise<"rejected">((resolve) => {
              if (signal?.aborted) return resolve("rejected")
              signal?.addEventListener("abort", () => resolve("rejected"), { once: true })
            }),
          ])
          resolveApprovalWaiter(row.id, "rejected")
          await broadcast(runtime.roomId, {
            type: "tool.approval_resolved",
            toolCallId: row.id,
            status: decision,
          })
          if (decision === "rejected") {
            await getDb()
              .update(toolCalls)
              .set({
                status: "rejected",
                resolvedAt: new Date(),
                error: signal?.aborted ? "Run stopped while awaiting approval" : "Rejected by a room admin",
              })
              .where(eq(toolCalls.id, row.id))
            return {
              ok: false,
              rejected: true,
              error: signal?.aborted
                ? "The run was stopped before approval."
                : "A room admin rejected this tool call.",
            }
          }
        }

        try {
          const result = await spec.execute(input, options.abortSignal)
          await getDb()
            .update(toolCalls)
            .set({
              status: "done",
              result: forStorage(result) as unknown,
              resolvedAt: new Date(),
            })
            .where(eq(toolCalls.id, row.id))
          return result
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          await getDb()
            .update(toolCalls)
            .set({ status: "error", error: redactSecrets(message).text, resolvedAt: new Date() })
            .where(eq(toolCalls.id, row.id))
          return { ok: false, error: message }
        }
      },
    })
  }
  return tools
}
