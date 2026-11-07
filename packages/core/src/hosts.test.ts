import { describe, expect, it } from "vitest"
import { isValidHostPattern, matchesHostPattern } from "./hosts"

describe("isValidHostPattern", () => {
  it("accepts valid hostnames and wildcard prefixes", () => {
    expect(isValidHostPattern("api.github.com")).toBe(true)
    expect(isValidHostPattern("*.github.com")).toBe(true)
    expect(isValidHostPattern("sub.domain.co.uk")).toBe(true)
    expect(isValidHostPattern("*.sub.domain.co.uk")).toBe(true)
  })

  it("rejects naked asterisks and invalid wildcards", () => {
    expect(isValidHostPattern("*")).toBe(false)
    expect(isValidHostPattern("*github.com")).toBe(false)
    expect(isValidHostPattern("api.*.com")).toBe(false)
    expect(isValidHostPattern("*.com")).toBe(false) // Needs at least 2 segments after *.
  })

  it("rejects IP addresses", () => {
    expect(isValidHostPattern("127.0.0.1")).toBe(false)
    expect(isValidHostPattern("192.168.1.1")).toBe(false)
    expect(isValidHostPattern("10.0.0.1")).toBe(false)
    expect(isValidHostPattern("169.254.169.254")).toBe(false)
    expect(isValidHostPattern("::1")).toBe(false)
  })

  it("rejects URLs, paths, ports, or protocols", () => {
    expect(isValidHostPattern("https://api.github.com")).toBe(false)
    expect(isValidHostPattern("api.github.com:443")).toBe(false)
    expect(isValidHostPattern("api.github.com/path")).toBe(false)
    expect(isValidHostPattern("user@api.github.com")).toBe(false)
  })

  it("rejects local and private TLDs unless explicitly permitted", () => {
    expect(isValidHostPattern("app.internal")).toBe(false)
    expect(isValidHostPattern("service.local")).toBe(false)
    expect(isValidHostPattern("myhost.localhost")).toBe(false)
    expect(isValidHostPattern("app.internal", { allowInternal: true })).toBe(true)
  })
})

describe("matchesHostPattern", () => {
  it("matches exact hostnames case-insensitively", () => {
    expect(matchesHostPattern("api.github.com", "api.github.com")).toBe(true)
    expect(matchesHostPattern("API.GITHUB.COM", "api.github.com")).toBe(true)
    expect(matchesHostPattern("other.github.com", "api.github.com")).toBe(false)
  })

  it("matches wildcard host patterns", () => {
    expect(matchesHostPattern("api.github.com", "*.github.com")).toBe(true)
    expect(matchesHostPattern("raw.githubusercontent.com", "*.githubusercontent.com")).toBe(true)
    expect(matchesHostPattern("deep.sub.github.com", "*.github.com")).toBe(true)
    expect(matchesHostPattern("github.com", "*.github.com")).toBe(true)
    expect(matchesHostPattern("fakegithub.com", "*.github.com")).toBe(false)
  })
})
