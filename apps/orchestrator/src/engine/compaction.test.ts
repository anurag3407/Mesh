import { describe, expect, it } from "vitest"
import type { ModelMessage, ToolModelMessage } from "ai"
import { compactTranscript, elideOldToolResults } from "./compaction"

describe("Compaction (E7)", () => {
  it("elides older tool results while keeping the last K=6 verbatim", () => {
    const messages: ModelMessage[] = []

    // Generate 10 tool messages
    for (let i = 1; i <= 10; i++) {
      messages.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: `call-${i}`,
            toolName: "test_tool",
            output: { value: `very long verbose output for step ${i}` } as any,
          },
        ],
      })
    }

    const { messages: result, elidedCount } = elideOldToolResults(messages, 6)
    expect(elidedCount).toBe(4)

    // The first 4 should be elided
    for (let i = 0; i < 4; i++) {
      const msg = result[i] as ToolModelMessage
      const part = msg.content[0] as any
      expect(part.output.type).toBe("text")
      expect(part.output.value).toContain("[result elided:")
      expect(part.output.value).toContain(`tool_calls/call-${i + 1}`)
    }

    // The last 6 should remain verbatim
    for (let i = 4; i < 10; i++) {
      const msg = result[i] as ToolModelMessage
      const part = msg.content[0] as any
      expect(part.output).toEqual({ value: `very long verbose output for step ${i + 1}` })
    }
  })

  it("compacts older transcript messages into a structured summary", () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "Initial user request" },
      { role: "assistant", content: "Working on it" },
      { role: "user", content: "Followup request" },
      { role: "assistant", content: "Executing steps" },
      { role: "user", content: "Latest feedback" },
    ]

    const result = compactTranscript({
      messages,
      summary: {
        goal: "Build auth routes",
        decisions: ["Use JWT cookies", "Strict CSRF validation"],
        filesTouched: ["apps/web/auth.ts", "packages/core/jwt.ts"],
        openQuestions: [],
        planStatus: "2/3 steps completed",
        factsLearned: ["Staging uses Redis for sessions"],
      },
    })

    expect(result.compactedThroughIdx).toBe(1)
    expect(result.messages[0]?.role).toBe("user")
    const summaryText = result.messages[0]?.content as string
    expect(summaryText).toContain("Goal: Build auth routes")
    expect(summaryText).toContain("Use JWT cookies")
    expect(summaryText).toContain("Staging uses Redis for sessions")
    expect(result.extractedFacts).toEqual(["Staging uses Redis for sessions"])
  })
})
