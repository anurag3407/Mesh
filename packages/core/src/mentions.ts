import type { AgentRef } from "./types"

export const ALL_BOTS_HANDLE = "all_bots"

const MENTION_RE = /(^|[^\w@])@([a-zA-Z][\w-]{0,38})/g

/** Extracts raw @handles in order of first appearance (lowercased, de-duplicated). */
export function extractHandles(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  // Ignore mentions inside fenced and inline code so code samples don't trigger bots.
  const stripped = text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ")
  for (const m of stripped.matchAll(MENTION_RE)) {
    const handle = m[2]!.toLowerCase()
    if (!seen.has(handle)) {
      seen.add(handle)
      out.push(handle)
    }
  }
  return out
}

/**
 * Resolves mentions to room agents, preserving mention order.
 * `@all_bots` expands to every room agent (in room order) at the position it appears.
 */
export function resolveMentions(text: string, roomAgents: AgentRef[]): AgentRef[] {
  const byHandle = new Map(roomAgents.map((a) => [a.handle.toLowerCase(), a]))
  const out: AgentRef[] = []
  const added = new Set<string>()
  const push = (a: AgentRef) => {
    if (!added.has(a.id)) {
      added.add(a.id)
      out.push(a)
    }
  }
  for (const handle of extractHandles(text)) {
    if (handle === ALL_BOTS_HANDLE) roomAgents.forEach(push)
    else {
      const agent = byHandle.get(handle)
      if (agent) push(agent)
    }
  }
  return out
}
