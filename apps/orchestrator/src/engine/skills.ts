import { and, eq, or } from "drizzle-orm"
import { z } from "zod"
import { skills } from "@mesh/db"
import { getDb } from "../db"
import type { ToolSpec } from "../tools/audited"

export interface SkillSeed {
  slug: string
  title: string
  description: string
  body: string
}

export const SEED_SKILLS: SkillSeed[] = [
  {
    slug: "write-and-run-tests",
    title: "Write and Run Tests",
    description: "Write unit or integration tests and verify passing assertions before finishing.",
    body: `### Procedure: Write and Run Tests
1. Identify the files and behavior being modified or created.
2. Locate existing test suites (e.g., in \`test/\` or adjacent \`*.test.ts\` files).
3. Write focused tests covering positive, edge, and error cases.
4. Execute tests using the test runner (e.g. \`pnpm test <filename>\` via computer or sandbox).
5. Ensure 100% of new and modified tests pass before concluding.`,
  },
  {
    slug: "open-pr",
    title: "Open a PR",
    description: "Inspect git status, create a clean branch, commit with conventional messages, and push.",
    body: `### Procedure: Open a PR
1. Run \`git_status\` and \`git_diff\` to inspect unstaged and staged changes.
2. Ensure changes are minimal, focused, and free of secrets or temporary files.
3. Run linters and tests to ensure clean state.
4. Create a descriptive commit message following Conventional Commits (e.g., \`feat(engine): ...\`).
5. Stage and commit changes cleanly.`,
  },
  {
    slug: "research-citations",
    title: "Research with Citations",
    description: "Conduct in-depth research across web and files, cross-referencing and citing sources.",
    body: `### Procedure: Research with Citations
1. Formulate distinct search queries covering key dimensions of the topic.
2. Use \`web_search\` or read local documents to collect evidence.
3. Cross-reference claims across multiple sources to ensure accuracy.
4. Synthesize findings into structured sections: Summary, Key Points, Evidence & Citations.
5. Provide explicit links or filenames for every major claim made.`,
  },
  {
    slug: "summarise-thread",
    title: "Summarise a Long Thread",
    description: "Analyze room or thread conversation, extract key decisions, blockers, and next steps.",
    body: `### Procedure: Summarise a Long Thread
1. Review the full thread history to understand the problem statement.
2. Identify core milestones: initial problem, alternatives proposed, key decisions, unresolved blockers.
3. Structure output into:
   - **Goal & Context**
   - **Key Decisions Made**
   - **Current Status / Open Blockers**
   - **Action Items & Owners**`,
  },
  {
    slug: "canvas-landing-page",
    title: "Build a Landing Page on the Canvas",
    description: "Design and construct an interactive, high-converting landing page layout on the room canvas.",
    body: `### Procedure: Build a Landing Page on the Canvas
1. Read current canvas state using \`canvas_read\`.
2. Plan the visual layout: Hero, Value Proposition, Feature Grid, Social Proof, and Call to Action.
3. Write clean, responsive markdown or canvas blocks with clear visual hierarchy.
4. Use \`canvas_patch\` or \`canvas_write\` to apply the changes atomically.
5. Review the rendered layout to verify readability, contrast, and layout flow.`,
  },
]

/**
 * Returns summary list of available skills (seed skills + org skills from DB).
 */
export async function getAvailableSkills(
  orgId: string,
): Promise<Array<{ slug: string; description: string }>> {
  const db = getDb()
  const custom = await db
    .select({
      slug: skills.slug,
      description: skills.description,
    })
    .from(skills)
    .where(
      and(
        eq(skills.orgId, orgId),
        or(eq(skills.visibility, "org"), eq(skills.visibility, "public")),
      ),
    )
    .catch(() => [])

  const map = new Map<string, string>()
  for (const s of SEED_SKILLS) {
    map.set(s.slug, s.description)
  }
  for (const c of custom) {
    map.set(c.slug, c.description)
  }

  return Array.from(map.entries()).map(([slug, description]) => ({ slug, description }))
}

/**
 * Formats skills list into a compact string for System Block 2.
 */
export function formatSkillsDigest(skillsList: Array<{ slug: string; description: string }>): string {
  if (skillsList.length === 0) return ""
  return [
    "Available skills (call load_skill({ slug }) to inspect full procedures):",
    ...skillsList.map((s) => `- ${s.slug}: ${s.description}`),
  ].join("\n")
}

export const loadSkillSchema = z.object({
  slug: z.string().describe("The slug identifier of the skill to load into context"),
})

export const proposeSkillSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).describe("Kebab-case identifier for the skill"),
  title: z.string().describe("Human-readable title"),
  description: z.string().max(200).describe("Single-sentence summary of when and how to use this skill"),
  body: z.string().describe("Detailed markdown instructions and procedure steps"),
})

export function skillTools(args: { orgId: string; agentId: string }): ToolSpec[] {
  return [
    {
      name: "load_skill",
      description:
        "Loads the full procedure and instructions for a specific skill into context by slug.",
      schema: loadSkillSchema,
      dangerous: false,
      execute: async ({ slug }: { slug: string }) => {
        const seed = SEED_SKILLS.find((s) => s.slug === slug)
        if (seed) {
          return {
            slug: seed.slug,
            title: seed.title,
            description: seed.description,
            instructions: seed.body,
          }
        }

        try {
          const db = getDb()
          const [found] = await db
            .select()
            .from(skills)
            .where(and(eq(skills.orgId, args.orgId), eq(skills.slug, slug)))
            .limit(1)

          if (found) {
            return {
              slug: found.slug,
              title: found.title,
              description: found.description,
              instructions: found.body,
            }
          }
        } catch {}

        throw new Error(
          `Skill "${slug}" not found. Available seed skills: ${SEED_SKILLS.map((s) => s.slug).join(", ")}`,
        )
      },
    },
    {
      name: "propose_skill",
      description:
        "Proposes a new reusable skill procedure for the workspace. Saved with 'proposed' status until reviewed by an admin.",
      schema: proposeSkillSchema,
      dangerous: false,
      execute: async (input: { slug: string; title: string; description: string; body: string }) => {
        const db = getDb()
        const [inserted] = await db
          .insert(skills)
          .values({
            orgId: args.orgId,
            slug: input.slug,
            title: input.title,
            description: input.description,
            body: input.body,
            visibility: "proposed",
          })
          .returning()

        if (!inserted) {
          throw new Error("Failed to insert proposed skill")
        }

        return {
          status: "proposed",
          id: inserted.id,
          slug: inserted.slug,
          message: `Skill "${input.slug}" successfully proposed. It will be active once approved by an admin.`,
        }
      },
    },
  ]
}
