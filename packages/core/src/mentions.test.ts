import { describe, expect, it } from "vitest"
import { extractHandles, resolveMentions } from "./mentions"
import type { AgentRef } from "./types"

const agents: AgentRef[] = [
  { id: "a", handle: "alice", kind: "llm" },
  { id: "b", handle: "bob", kind: "llm" },
  { id: "c", handle: "carol", kind: "external" },
]

describe("extractHandles", () => {
  it("returns handles in order of first appearance, de-duplicated and lowercased", () => {
    expect(extractHandles("@Bob then @alice then @BOB")).toEqual(["bob", "alice"])
  })

  it("ignores mentions inside fenced and inline code", () => {
    const text = "ping @alice\n```\n@bob should not match\n```\nand `@carol` inline"
    expect(extractHandles(text)).toEqual(["alice"])
  })

  it("does not treat emails or double-@ as mentions", () => {
    expect(extractHandles("mail me at a@b.com or @@nope")).toEqual([])
  })
})

describe("resolveMentions", () => {
  it("resolves in mention order", () => {
    expect(resolveMentions("@carol @alice", agents).map((a) => a.id)).toEqual(["c", "a"])
  })

  it("expands @all_bots at its position without duplicates", () => {
    expect(resolveMentions("@alice and @all_bots", agents).map((a) => a.id)).toEqual([
      "a",
      "b",
      "c",
    ])
  })

  it("ignores handles that are not room agents", () => {
    expect(resolveMentions("@dave @bob", agents).map((a) => a.id)).toEqual(["b"])
  })
})
