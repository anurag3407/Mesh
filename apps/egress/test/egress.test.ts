import { describe, expect, it } from "vitest"
import { isPrivateIp, assertSafeEgressHost } from "../src/ssrf"
import { isHostAllowed } from "../src/swapper"
import { scrubResponseText } from "../src/scrub"

describe("Egress SSRF Guard", () => {
  it("identifies private IPv4 and loopback addresses", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true)
    expect(isPrivateIp("10.0.0.5")).toBe(true)
    expect(isPrivateIp("172.16.0.1")).toBe(true)
    expect(isPrivateIp("172.31.255.255")).toBe(true)
    expect(isPrivateIp("192.168.1.100")).toBe(true)
    expect(isPrivateIp("169.254.169.254")).toBe(true) // AWS metadata
    expect(isPrivateIp("100.64.0.1")).toBe(true) // CGNAT
    expect(isPrivateIp("0.0.0.0")).toBe(true)
  })

  it("identifies private IPv6 addresses", () => {
    expect(isPrivateIp("::1")).toBe(true)
    expect(isPrivateIp("fe80::1")).toBe(true)
    expect(isPrivateIp("fc00::1")).toBe(true)
  })

  it("allows public IP addresses", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false)
    expect(isPrivateIp("1.1.1.1")).toBe(false)
    expect(isPrivateIp("142.250.190.46")).toBe(false)
  })

  it("blocks private hostnames via assertSafeEgressHost", async () => {
    await expect(assertSafeEgressHost("127.0.0.1")).rejects.toThrow(/SSRF blocked/)
    await expect(assertSafeEgressHost("169.254.169.254")).rejects.toThrow(/SSRF blocked/)
  })
})

describe("Egress Host Allowlist", () => {
  it("matches exact hosts", () => {
    expect(isHostAllowed("api.github.com", ["api.github.com", "api.stripe.com"])).toBe(true)
    expect(isHostAllowed("evil.com", ["api.github.com"])).toBe(false)
  })

  it("matches wildcard hosts", () => {
    expect(isHostAllowed("api.github.com", ["*.github.com"])).toBe(true)
    expect(isHostAllowed("raw.github.com", ["*.github.com"])).toBe(true)
    expect(isHostAllowed("github.com", ["*.github.com"])).toBe(true)
    expect(isHostAllowed("api.gitlab.com", ["*.github.com"])).toBe(false)
  })
})

describe("Egress Response Scrubbing", () => {
  it("scrubs raw secret plaintexts from response text", () => {
    const map = new Map([["sk_live_secret12345", "saaya_ph_token001"]])
    const input = '{"status": "ok", "token": "sk_live_secret12345"}'
    const output = scrubResponseText(input, map)
    expect(output).toBe('{"status": "ok", "token": "saaya_ph_token001"}')
    expect(output).not.toContain("sk_live_secret12345")
  })

  it("scrubs base64 and url-encoded variants", () => {
    const raw = "supersecrettoken999"
    const b64 = Buffer.from(raw).toString("base64")
    const map = new Map([[raw, "saaya_ph_placeholder"]])

    const input = `Authorization: Basic ${b64}`
    const output = scrubResponseText(input, map)
    expect(output).not.toContain(b64)
    expect(output).toContain("saaya_ph_placeholder")
  })
})
