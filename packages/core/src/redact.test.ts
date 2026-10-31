import { describe, expect, it } from "vitest"
import { redactSecrets } from "./redact"

// Secret-shaped fixtures are assembled at runtime so the repository never
// contains a string that a secret scanner could mistake for a live credential.
const join = (...parts: string[]) => parts.join("")

const secrets = [
  join("AKIA", "IOSFODNN7EXAMPLE"),
  join("sk-", "proj-", "abcdefghijklmnopqrstuvwxyz123456"),
  join("sk-", "ant-api03-", "abcdefghijklmnopqrstuvwxyz"),
  join("gh", "p_", "abcdefghijklmnopqrstuvwxyz0123456789"),
  join(
    "github_",
    "pat_",
    "11ABCDEFG0123456789_",
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012345",
  ),
  join("xox", "b-", "123456789012-123456789012-abcdefghijklmnop"),
  join("AIz", "aSyA1234567890abcdefghijklmnopqrstuv"),
  join("gs", "k_", "abcdefghijklmnopqrstuvwxyz0123456789ABCD"),
  join("mesh_", "ak_", "abcdefghijklmnopqrstuvwx"),
  join(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    ".",
    "eyJzdWIiOiIxMjM0NTY3ODkwIn0",
    ".",
    "dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
  ),
]

describe("redactSecrets", () => {
  it("redacts every supported secret shape", () => {
    const input = `found ${secrets.join(" and ")}`
    const { text, redactions } = redactSecrets(input)
    for (const secret of secrets) expect(text).not.toContain(secret)
    expect(text).toContain("[REDACTED:aws_access_key]")
    expect(text).toContain("[REDACTED:anthropic_key]")
    expect(text).toContain("[REDACTED:openai_key]")
    expect(text).toContain("[REDACTED:github_token]")
    expect(text).toContain("[REDACTED:github_pat]")
    expect(text).toContain("[REDACTED:slack_token]")
    expect(text).toContain("[REDACTED:google_api_key]")
    expect(text).toContain("[REDACTED:groq_key]")
    expect(text).toContain("[REDACTED:mesh_agent_key]")
    expect(text).toContain("[REDACTED:jwt]")
    expect(redactions.length).toBeGreaterThanOrEqual(10)
  })

  it("redacts PEM private keys across lines", () => {
    const pem = join(
      "-----BEGIN ",
      "RSA PRIVATE KEY",
      "-----\nMIIEow\nabc\n-----END ",
      "RSA PRIVATE KEY",
      "-----",
    )
    const { text } = redactSecrets(`key: ${pem}`)
    expect(text).toBe("key: [REDACTED:private_key]")
  })

  it("leaves ordinary text untouched", () => {
    const input = "The build passed on Node 24 with pnpm."
    expect(redactSecrets(input)).toEqual({ text: input, redactions: [] })
  })
})
