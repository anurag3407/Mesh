import { describe, expect, it } from "vitest"
import { agentKeyPrefix, generateAgentApiKey, hashAgentApiKey } from "./agent-key"

describe("agent API keys", () => {
  it("generates a mesh_ak token with a prefix and hash", () => {
    const key = generateAgentApiKey()
    expect(key.token.startsWith("mesh_ak_")).toBe(true)
    expect(key.token.length).toBeGreaterThan(32)
    expect(key.prefix).toBe(key.token.slice(0, 16))
    expect(key.hash).toBe(hashAgentApiKey(key.token))
    expect(key.hash).toHaveLength(64)
    expect(key.last4).toBe(key.token.slice(-4))
  })

  it("hashes deterministically and differently per key", () => {
    const a = generateAgentApiKey()
    const b = generateAgentApiKey()
    expect(hashAgentApiKey(a.token)).toBe(a.hash)
    expect(a.hash).not.toBe(b.hash)
    expect(agentKeyPrefix(a.token)).not.toBe(agentKeyPrefix(b.token))
  })
})
