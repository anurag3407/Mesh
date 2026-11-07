import { describe, expect, it } from "vitest"
import { z } from "zod"
import type { ToolSpec } from "../tools/audited"
import {
  ALWAYS_CORE_TOOLS,
  partitionToolsForSearch,
  TOOL_SEARCH_THRESHOLD,
  ToolIndex,
} from "./tool-search"

function makeMockSpec(name: string, description: string): ToolSpec {
  return {
    name,
    description,
    schema: z.object({}),
    dangerous: false,
    execute: async () => ({}),
  }
}

describe("tool-search (BM25 and partitioning)", () => {
  it("indexes and retrieves tools using BM25 relevance", () => {
    const specs: ToolSpec[] = [
      makeMockSpec("stripe_create_charge", "Charge a credit card or customer account"),
      makeMockSpec("stripe_refund", "Refund a previously processed payment transaction"),
      makeMockSpec("github_list_prs", "List pull requests in a repository"),
      makeMockSpec("linear_create_issue", "Create a new issue on the Linear team board"),
    ]

    const index = new ToolIndex(specs)
    const matches = index.search("create charge")

    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0]?.name).toBe("stripe_create_charge")
  })

  it("does not partition when tool count is below threshold", () => {
    const specs: ToolSpec[] = Array.from({ length: 10 }, (_, i) =>
      makeMockSpec(`tool_${i}`, `Tool description ${i}`),
    )

    const partitioned = partitionToolsForSearch(specs)
    expect(partitioned.exposed.length).toBe(10)
    expect(partitioned.searchTool).toBeUndefined()
  })

  it("partitions tools and provides find_tools when tool count exceeds threshold", () => {
    const specs: ToolSpec[] = [
      makeMockSpec("fs_read", "Read file"),
      makeMockSpec("fs_write", "Write file"),
      makeMockSpec("update_plan", "Update plan"),
      ...Array.from({ length: 45 }, (_, i) =>
        makeMockSpec(`mcp_tool_${i}`, `Extra MCP tool capability ${i}`),
      ),
    ]

    expect(specs.length).toBeGreaterThan(TOOL_SEARCH_THRESHOLD)

    const partitioned = partitionToolsForSearch(specs)
    expect(partitioned.searchTool).toBeDefined()
    expect(partitioned.exposed.some((t) => t.name === "find_tools")).toBe(true)
    expect(partitioned.exposed.some((t) => t.name === "fs_read")).toBe(true)
  })
})
