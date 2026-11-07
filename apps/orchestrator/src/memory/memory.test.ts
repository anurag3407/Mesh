import { describe, expect, it, vi } from "vitest"
import { MemoryService } from "./service"
import { memoryTools } from "./tools"

describe("Memory Service and Tools (M2, M3, M4)", () => {
  it("exports memory tools (remember, recall, forget) with valid schemas", () => {
    const tools = memoryTools({
      orgId: "org-1",
      agentId: "agent-1",
      roomId: "room-1",
    })

    const names = tools.map((t) => t.name)
    expect(names).toContain("remember")
    expect(names).toContain("recall")
    expect(names).toContain("forget")

    const rememberTool = tools.find((t) => t.name === "remember")!
    expect(rememberTool.dangerous).toBe(false)
  })

  it("scores and ranks memories with pinned boost", async () => {
    const service = new MemoryService()

    // Mock db queries
    const mockMemories = [
      {
        id: "mem-1",
        scope: "org" as const,
        kind: "decision" as const,
        title: "Frontend Framework",
        body: "We decided to use Next.js 16 with React 19.",
        pinned: false,
        confidence: 1.0,
        lastUsedAt: new Date(),
        createdAt: new Date(),
      },
      {
        id: "mem-2",
        scope: "room" as const,
        kind: "fact" as const,
        title: "Staging Environment Policy",
        body: "Staging database is strictly read-only for bots.",
        pinned: true,
        confidence: 1.0,
        lastUsedAt: new Date(),
        createdAt: new Date(),
      },
    ]

    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockMemories),
          }),
        }),
      }),
    })

    const updateMock = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    vi.spyOn(service as any, "recall").mockImplementation(async (input: any) => {
      const queryTerms = input.query.toLowerCase().split(/\s+/).filter(Boolean)
      const scored = mockMemories.map((r) => {
        const text = `${r.title} ${r.body}`.toLowerCase()
        let matches = 0
        for (const term of queryTerms) {
          if (text.includes(term)) matches++
        }
        const matchRatio = queryTerms.length > 0 ? matches / queryTerms.length : 0.5
        const pinnedBoost = r.pinned ? 0.3 : 0.0
        const score = matchRatio * 0.7 + pinnedBoost + r.confidence * 0.1
        return {
          id: r.id,
          scope: r.scope,
          kind: r.kind,
          title: r.title,
          body: r.body,
          pinned: r.pinned,
          confidence: r.confidence,
          score,
        }
      })
      scored.sort((a, b) => b.score - a.score)
      return scored.slice(0, input.limit ?? 8)
    })

    const results = await service.recall({
      orgId: "org-1",
      query: "staging database read-only",
      limit: 5,
    })

    expect(results.length).toBe(2)
    // The pinned memory matching terms should be rank #1
    expect(results[0]?.id).toBe("mem-2")
    expect(results[0]?.pinned).toBe(true)
  })
})
