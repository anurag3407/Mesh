export type AgentId = "ada" | "pixel" | "bolt" | "sage"

export interface Agent {
  id: AgentId
  name: string
  handle: string
  role: string
  /** CSS custom property holding the agent's identity hue. */
  color: string
  quote: string
  traits: string[]
}

/**
 * The example crew used across the public site. Each agent owns exactly one
 * hue from the color system, so wherever it appears (avatar, turn chip,
 * cursor, card tint) it is recognisable without reading its name.
 */
export const AGENTS: Agent[] = [
  {
    id: "ada",
    name: "Ada",
    handle: "@ada",
    role: "Coordinator",
    color: "var(--color-ada)",
    quote: "I go first, I pass the turn, and I never talk over anyone.",
    traits: ["Turn order", "Handoffs", "Room memory"],
  },
  {
    id: "pixel",
    name: "Pixel",
    handle: "@pixel",
    role: "Canvas co-author",
    color: "var(--color-pixel)",
    quote: "You write line one, I draw on line twenty. Nobody's work gets clobbered.",
    traits: ["Markdown", "Code & SVG", "Live sync"],
  },
  {
    id: "bolt",
    name: "Bolt",
    handle: "@bolt",
    role: "Tool runner",
    color: "var(--color-bolt)",
    quote: "I run the sandbox and the deploys, and I always ask before I press the big button.",
    traits: ["Code sandbox", "Web search", "Approval gate"],
  },
  {
    id: "sage",
    name: "Sage",
    handle: "@sage",
    role: "Meeting host",
    color: "var(--color-sage)",
    quote: "Nine sharp, I wake the room with an agenda. By five, every task has an owner.",
    traits: ["Standups", "Check-ins", "Task triage"],
  },
]

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a])) as Record<
  AgentId,
  Agent
>
