import { describe, expect, it, vi, beforeEach } from "vitest"
import { toAuditedTools, type ToolSpec, type ToolRuntime } from "./audited"
import { z } from "zod"

const broadcastEvents: Array<{ roomId: string; event: any }> = []

vi.mock("../realtime", () => ({
  broadcast: (roomId: string, event: any) => {
    broadcastEvents.push({ roomId, event })
    return Promise.resolve()
  },
}))

const insertedToolCallId = "tool-call-123"

vi.mock("../db", () => ({
  getDb: () => ({
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([{ id: insertedToolCallId }]),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    }),
  }),
}))

vi.mock("../push", () => ({
  notifyHumansNeeded: vi.fn(),
}))

vi.mock("./approvals", () => ({
  waitForApproval: vi.fn().mockResolvedValue("approved"),
  resolveApprovalWaiter: vi.fn(),
}))

describe("toAuditedTools", () => {
  beforeEach(() => {
    broadcastEvents.length = 0
  })

  it("threads toolCallId into ctx and broadcasts tool.started and tool.finished", async () => {
    let receivedToolCallId = ""

    const dummySpec: ToolSpec = {
      name: "test_tool",
      description: "A test tool",
      schema: z.object({ query: z.string() }),
      dangerous: false,
      execute: async (input, signal, ctx) => {
        receivedToolCallId = ctx?.toolCallId ?? ""
        return { result: "ok for " + input.query }
      },
    }

    const runtime: ToolRuntime = {
      orgId: "org-1",
      roomId: "room-1",
      agentId: "agent-1",
      runId: "run-1",
      messageId: "msg-1",
    }

    const toolSet = toAuditedTools([dummySpec], runtime)
    const result = await (toolSet.test_tool as any).execute({ query: "hello" }, {})

    expect(receivedToolCallId).toBe("tool-call-123")
    expect(result).toEqual({ result: "ok for hello" })

    // Check broadcast events
    const started = broadcastEvents.find((e) => e.event.type === "tool.started")
    expect(started).toBeDefined()
    expect(started?.event.toolCallId).toBe("tool-call-123")
    expect(started?.event.toolName).toBe("test_tool")

    const finished = broadcastEvents.find((e) => e.event.type === "tool.finished")
    expect(finished).toBeDefined()
    expect(finished?.event.toolCallId).toBe("tool-call-123")
    expect(finished?.event.status).toBe("done")
    expect(finished?.event.durationMs).toBeGreaterThanOrEqual(0)
  })
})
