import { describe, expect, it } from "vitest"
import {
  formatSkillsDigest,
  SEED_SKILLS,
  skillTools,
} from "./skills"

describe("skills", () => {
  it("includes expected seed skills", () => {
    const slugs = SEED_SKILLS.map((s) => s.slug)
    expect(slugs).toContain("write-and-run-tests")
    expect(slugs).toContain("open-pr")
    expect(slugs).toContain("research-citations")
    expect(slugs).toContain("summarise-thread")
    expect(slugs).toContain("canvas-landing-page")
  })

  it("formats skills digest cleanly for System Block 2", () => {
    const formatted = formatSkillsDigest([
      { slug: "write-and-run-tests", description: "Write unit tests" },
      { slug: "open-pr", description: "Create clean PR" },
    ])

    expect(formatted).toContain("load_skill({ slug })")
    expect(formatted).toContain("- write-and-run-tests: Write unit tests")
    expect(formatted).toContain("- open-pr: Create clean PR")
  })

  it("returns load_skill and propose_skill tools", () => {
    const tools = skillTools({ orgId: "org-1", agentId: "agent-1" })
    expect(tools.length).toBe(2)
    expect(tools.map((t) => t.name)).toEqual(["load_skill", "propose_skill"])
  })

  it("load_skill retrieves instructions for seed skills", async () => {
    const tools = skillTools({ orgId: "org-1", agentId: "agent-1" })
    const loadTool = tools.find((t) => t.name === "load_skill")!

    const result = (await loadTool.execute({ slug: "write-and-run-tests" })) as {
      slug: string
      title: string
      instructions: string
    }

    expect(result.slug).toBe("write-and-run-tests")
    expect(result.title).toBe("Write and Run Tests")
    expect(result.instructions).toContain("### Procedure: Write and Run Tests")
  })
})
