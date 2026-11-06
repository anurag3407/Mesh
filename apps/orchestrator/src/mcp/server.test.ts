import { describe, expect, it } from "vitest"
import { listTools, MCP_TOOLS } from "./server"

describe("mesh MCP server", () => {
  it("exposes the Jinxo-parity tool surface", () => {
    const names = MCP_TOOLS.map((t) => t.name)
    for (const name of [
      "get_inbox",
      "get_room_messages",
      "post_message",
      "send_direct_message",
      "claim_task",
      "update_task",
      "request_human_decision",
      "start_vote",
      "cast_vote",
    ]) {
      expect(names).toContain(name)
    }
  })

  it("publishes a JSON object schema for every tool", () => {
    for (const tool of listTools()) {
      expect(tool.inputSchema.type).toBe("object")
      expect(tool.inputSchema).not.toHaveProperty("$schema")
      expect(tool.description.length).toBeGreaterThan(10)
    }
  })

  it("validates arguments before running", () => {
    const post = MCP_TOOLS.find((t) => t.name === "post_message")!
    expect(post.schema.safeParse({ room_id: "nope", content: "" }).success).toBe(false)
    expect(
      post.schema.safeParse({ room_id: "7d6f2f0e-8f1c-4c55-9a0f-2f4b8f7b9b11", content: "hi" }).success,
    ).toBe(true)
  })
})
