import { afterEach, describe, expect, it, vi } from "vitest"
import { handleFromName } from "./agent-handle"
import { dateTimeLocalToIso, toDateTimeLocalValue } from "./datetime"
import { defaultModel } from "./model-options"
import { recoveryHint } from "./recovery-hint"
import { approvalMsLeft, describeToolCall, formatCountdown } from "./tool-summary"

describe("meeting times", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("keeps the wall-clock time the user picked, in their own zone", () => {
    vi.stubEnv("TZ", "Asia/Kolkata")
    const local = "2026-11-05T10:00"
    expect(dateTimeLocalToIso(local)).toBe("2026-11-05T04:30:00.000Z")
    expect(toDateTimeLocalValue(new Date("2026-11-05T04:30:00.000Z"))).toBe(local)
  })

  it("formats the earliest allowed time in the user's zone, not UTC", () => {
    vi.stubEnv("TZ", "America/New_York")
    expect(toDateTimeLocalValue(new Date("2026-11-05T15:05:00.000Z"))).toBe("2026-11-05T10:05")
  })

  it("rejects an empty value", () => {
    expect(dateTimeLocalToIso("")).toBeNull()
  })
})

describe("approval summaries", () => {
  it("describes a known tool with its most useful argument", () => {
    expect(
      describeToolCall({
        toolName: "create_task",
        input: { title: "Ship it", priority: 1 },
        agentName: "Reviewer",
      }),
    ).toBe("Reviewer wants to create a task: “Ship it”.")
  })

  it("makes an unknown tool name readable and copes with missing details", () => {
    expect(describeToolCall({ toolName: "mcp_delete_branch", input: null })).toBe(
      "An agent wants to use delete branch.",
    )
  })

  it("counts down to the five minute limit and stops at zero", () => {
    const createdAt = "2026-11-05T10:00:00.000Z"
    const now = new Date("2026-11-05T10:01:00.000Z").getTime()
    const left = approvalMsLeft(createdAt, now)
    expect(left).toBe(4 * 60_000)
    expect(formatCountdown(left)).toBe("4:00")
    expect(formatCountdown(61_000)).toBe("1:01")
    expect(formatCountdown(-5_000)).toBe("0:00")
  })
})

describe("recovery hints", () => {
  const base = { orgSlug: "acme", roomId: "r1" }

  it("sends key problems to provider keys", () => {
    const hint = recoveryHint({ ...base, text: "@bot has no API key yet." })
    expect(hint?.href).toBe("/acme/settings/keys")
  })

  it("sends limit problems to the room's settings", () => {
    const hint = recoveryHint({ ...base, text: "daily budget exhausted" })
    expect(hint?.href).toBe("/acme/r/r1/settings")
  })

  it("offers nothing when it does not know the fix", () => {
    expect(recoveryHint({ ...base, text: "the model went for a walk" })).toBeNull()
  })
})

describe("agent handles", () => {
  it("builds a valid handle from a display name", () => {
    expect(handleFromName("Code Reviewer!")).toBe("code-reviewer")
    expect(handleFromName("Écrivain 2")).toBe("ecrivain-2")
  })

  it("starts with a letter, as the server requires", () => {
    expect(handleFromName("3D Artist")).toBe("d-artist")
    expect(handleFromName("123")).toBe("")
  })

  it("stays within the length the server accepts", () => {
    expect(handleFromName("a".repeat(80)).length).toBeLessThanOrEqual(39)
  })
})

describe("model defaults", () => {
  it("suggests a model per provider and none for custom servers", () => {
    expect(defaultModel("anthropic")).toBe("claude-sonnet-5-5")
    expect(defaultModel("openai-compatible")).toBe("")
  })
})
