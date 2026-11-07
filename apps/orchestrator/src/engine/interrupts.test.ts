import { describe, expect, it } from "vitest"
import { registerRun, unregisterRun } from "../active-runs"
import { handleMidRunInterrupt } from "./interrupts"

describe("mid-run interrupts", () => {
  it("steers an active v2 run when a human message mentions the agent", () => {
    const roomId = "room-int-1"
    const agentId = "agent-v2-1"
    const runId = "run-v2-1"

    registerRun(runId, roomId, { agentId, engine: "v2" })

    const result = handleMidRunInterrupt(roomId, {
      id: "msg-steer-1",
      content: "@coder wait, use TypeScript instead of Python",
      senderType: "human",
      mentions: [agentId],
    })

    expect(result.steered).toBe(true)
    expect(result.steeredRunIds).toContain(runId)

    unregisterRun(runId)
  })

  it("aborts active runs when a human message does not mention the running agent", () => {
    const roomId = "room-int-2"
    const agentId = "agent-v2-2"
    const runId = "run-v2-2"

    const controller = registerRun(runId, roomId, { agentId, engine: "v2" })

    const result = handleMidRunInterrupt(roomId, {
      id: "msg-normal-1",
      content: "Let us discuss something else",
      senderType: "human",
      mentions: [],
    })

    expect(result.steered).toBe(false)
    expect(result.abortedCount).toBe(1)
    expect(controller.signal.aborted).toBe(true)

    unregisterRun(runId)
  })
})
