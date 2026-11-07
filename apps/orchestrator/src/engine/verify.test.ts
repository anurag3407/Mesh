import { describe, expect, it } from "vitest"
import {
  buildSelfVerificationPrompt,
  getVerifyMode,
} from "./verify"

describe("verify", () => {
  it("defaults to self verification when engine is v2 or verify is unset", () => {
    expect(getVerifyMode(null)).toBe("self")
    expect(getVerifyMode({})).toBe("self")
    expect(getVerifyMode({ verify: "self" })).toBe("self")
    expect(getVerifyMode({ verify: "critic" })).toBe("critic")
    expect(getVerifyMode({ verify: "off" })).toBe("off")
  })

  it("builds self-verification checklist containing requirements and evidence prompts", () => {
    const prompt = buildSelfVerificationPrompt("Refactor authentication module to support OAuth PKCE")
    expect(prompt).toContain("Verification checklist before concluding:")
    expect(prompt).toContain("Refactor authentication module to support OAuth PKCE")
    expect(prompt).toContain("Re-read the initial prompt and task requirements")
    expect(prompt).toContain("concrete evidence")
    expect(prompt).toContain("tests or linters")
  })
})
