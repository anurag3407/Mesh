import { debateRoleInstruction, parseCapabilities, type TurnRole } from "@mesh/core"
import { getProviderCapabilities } from "@mesh/llm"
import type { ModelMessage, SystemModelMessage, UserModelMessage } from "ai"
import type { AgentRow, ContextMessage, RoomRow } from "../runner/context"
import type { ToolSpec } from "../tools/audited"

export interface CanvasDiffInfo {
  id: string
  title: string
  diffSummary: string
}

export interface TaskContextItem {
  number: number
  title: string
  status: string
  kind: string
  owner?: string
}

export interface VolatileTailArgs {
  now: Date | string
  recalledMemories?: Array<{ id: string; title: string; body: string; scope?: string }>
  canvasDiffs?: CanvasDiffInfo[]
  openTasks?: TaskContextItem[]
  activeTaskBrief?: string
  currentTrigger?: string
  operatorNotes?: string[]
}

export interface BuildEngineContextArgs {
  agent: AgentRow
  room: RoomRow
  provider: string
  role?: TurnRole
  skillsIndex?: Array<{ slug: string; description: string }>
  pinnedMemories?: Array<{ id: string; title: string; body: string }>
  roomHistory: ContextMessage[]
  runHistory?: ModelMessage[]
  volatileTail: VolatileTailArgs
}

export interface EngineContextResult {
  /** The full array of ModelMessages passed to the language model. */
  messages: ModelMessage[]
  /** The prefix messages (system blocks, room history, and run history) excluding the volatile tail. */
  prefix: ModelMessage[]
  /** The volatile tail message. */
  tail: UserModelMessage
  /** JSON-stringified prefix for byte-stability assertions. */
  prefixString: string
}

function label(message: ContextMessage): string {
  if (message.senderType === "system") return "System"
  if (message.senderType === "agent") {
    return message.senderHandle
      ? `${message.senderName} (@${message.senderHandle}) (agent)`
      : `${message.senderName} (agent)`
  }
  return `${message.senderName} (human)`
}

/**
 * Sorts tool specs deterministically by name for cache-friendly tool definitions.
 */
export function sortToolSpecs(specs: ToolSpec[]): ToolSpec[] {
  return [...specs].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Computes a concise line diff summary between previous and current text.
 */
export function computeCanvasDiffSummary(oldText?: string | null, newText?: string | null): string {
  if (oldText === undefined || oldText === null) {
    const lines = (newText ?? "").split("\n").length
    return `${lines} lines total`
  }
  if (oldText === newText) {
    const lines = (newText ?? "").split("\n").length
    return `unchanged (${lines} lines)`
  }

  const oldLines = oldText ? oldText.split("\n") : []
  const newLines = newText ? newText.split("\n") : []

  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)

  let added = 0
  let removed = 0

  for (const line of newLines) {
    if (!oldSet.has(line)) added++
  }
  for (const line of oldLines) {
    if (!newSet.has(line)) removed++
  }

  if (added === 0 && removed === 0) {
    return "reordered or modified lines"
  }

  return `+${added} -${removed} lines`
}

/**
 * Builds structured, append-only messages laid out for prefix caching:
 * - [system 1: frozen]: engine rules + agent identity + instructions (breakpoint 1)
 * - [system 2: slow-changing]: room directive, skills index, pinned memories (breakpoint 2)
 * - [messages: room history]: prior turns (others -> user, this agent -> assistant)
 * - [messages: this run]: append-only steps from this run (breakpoint 3 rolling)
 * - [volatile tail]: now time, recalled memories, canvas diffs, tasks, trigger (never cached)
 */
export function buildEngineContext(args: BuildEngineContextArgs): EngineContextResult {
  const caps = getProviderCapabilities(args.provider as any)
  const agentCaps = parseCapabilities(args.agent.capabilities)

  const cacheOption = caps.supportsPromptCache
    ? { [args.provider]: { cacheControl: { type: "ephemeral" as const } } }
    : undefined

  // 1. System 1 (Frozen): Engine rules + agent identity + instructions
  const system1Parts = [
    "You are an autonomous teammate running on Sayabot Engine v2 in a multiplayer workspace.",
    "Engine Rules:\n- Keep your replies and actions focused, accurate, and actionable.\n- Markdown is supported (code blocks, tables, LaTeX math, Mermaid diagrams).\n- Reply as yourself only. Do not speak for other humans or agents in the room.\n- Deterministic and durable: verify your steps and maintain clean state.\n- To hand off to another agent, mention them with @handle.",
    `Identity: You are @${args.agent.handle} (${args.agent.displayName}).`,
  ]

  if (args.agent.systemPrompt?.trim()) {
    system1Parts.push(`Your Instructions:\n${args.agent.systemPrompt.trim()}`)
  }

  if (agentCaps.computer) {
    system1Parts.push(
      "Persistent Computer Environment:\n" +
        "- /home/bot is your persistent workspace across turns.\n" +
        "- Use computer tools to inspect code, run tests, and manage files.\n" +
        "- Granted secrets are available via environment placeholders ($GITHUB_TOKEN, etc.).\n" +
        "- Egress network is HTTPS only through Secret Broker.",
    )
  }

  const system1Message: SystemModelMessage = {
    role: "system",
    content: system1Parts.join("\n\n"),
    ...(cacheOption ? { providerOptions: cacheOption } : {}),
  }

  // 2. System 2 (Slow-changing): Room directive, skills index, pinned memories
  const system2Parts: string[] = []

  if (args.room.systemDirective?.trim()) {
    system2Parts.push(`Room Directive (#${args.room.name}):\n${args.room.systemDirective.trim()}`)
  } else {
    system2Parts.push(`Room: #${args.room.name}`)
  }

  if (args.skillsIndex && args.skillsIndex.length > 0) {
    const sortedSkills = [...args.skillsIndex].sort((a, b) => a.slug.localeCompare(b.slug))
    system2Parts.push(
      "Available Skills (use load_skill({ slug }) to inspect full procedure):\n" +
        sortedSkills.map((s) => `- ${s.slug}: ${s.description}`).join("\n"),
    )
  }

  if (args.pinnedMemories && args.pinnedMemories.length > 0) {
    const sortedMemories = [...args.pinnedMemories].sort((a, b) => a.id.localeCompare(b.id))
    system2Parts.push(
      "Pinned Team Memories:\n" +
        sortedMemories.map((m) => `[#${m.id}] ${m.title}: ${m.body}`).join("\n"),
    )
  }

  const role = args.role ? debateRoleInstruction(args.role) : ""
  if (role) {
    system2Parts.push(role)
  }

  const system2Message: SystemModelMessage = {
    role: "system",
    content: system2Parts.join("\n\n"),
    ...(cacheOption ? { providerOptions: cacheOption } : {}),
  }

  // 3. Room History: map prior turns
  const roomHistoryMessages: ModelMessage[] = args.roomHistory.map((m) => {
    if (m.senderType === "agent" && m.senderId === args.agent.id) {
      return {
        role: "assistant" as const,
        content: m.content,
      }
    }
    return {
      role: "user" as const,
      content: `[${label(m)}]: ${m.content}`,
    }
  })

  // 4. This Run History (append-only)
  const runHistory = args.runHistory ? [...args.runHistory] : []

  // If prompt cache is supported and runHistory has steps, apply rolling breakpoint 3
  if (cacheOption && runHistory.length > 0) {
    const lastIdx = runHistory.length - 1
    const lastMsg = runHistory[lastIdx]
    if (lastMsg) {
      runHistory[lastIdx] = {
        ...lastMsg,
        providerOptions: {
          ...((lastMsg as Record<string, unknown>).providerOptions as Record<string, unknown> ?? {}),
          ...cacheOption,
        },
      } as ModelMessage
    }
  }

  const prefix: ModelMessage[] = [
    system1Message,
    system2Message,
    ...roomHistoryMessages,
    ...runHistory,
  ]

  // 5. Volatile Tail (never cached, contains now, recalled memories, diffs, trigger)
  const nowIso =
    typeof args.volatileTail.now === "string"
      ? args.volatileTail.now
      : args.volatileTail.now.toISOString()

  const tailParts: string[] = [`Current Time: ${nowIso}`]

  if (args.volatileTail.recalledMemories && args.volatileTail.recalledMemories.length > 0) {
    tailParts.push(
      "<recalled>\n" +
        args.volatileTail.recalledMemories
          .map((m) => `[#${m.id}] (${m.scope || "team"}) ${m.title}: ${m.body}`)
          .join("\n") +
        "\n</recalled>",
    )
  }

  if (args.volatileTail.canvasDiffs && args.volatileTail.canvasDiffs.length > 0) {
    tailParts.push(
      "Canvas Status:\n" +
        args.volatileTail.canvasDiffs
          .map(
            (c) =>
              `- Canvas "${c.title}" (id=${c.id}): ${c.diffSummary}. Use canvas_read({ canvasId: "${c.id}" }) to inspect.`,
          )
          .join("\n"),
    )
  }

  if (args.volatileTail.activeTaskBrief) {
    tailParts.push(args.volatileTail.activeTaskBrief)
  } else if (args.volatileTail.openTasks && args.volatileTail.openTasks.length > 0) {
    tailParts.push(
      "Open Tasks in Room:\n" +
        args.volatileTail.openTasks
          .map(
            (t) =>
              `- MESH-${t.number} [${t.kind}] ${t.title} (${t.status}, ${t.owner || "unassigned"}) id=${t.number}`,
          )
          .join("\n"),
    )
  }

  if (args.volatileTail.operatorNotes && args.volatileTail.operatorNotes.length > 0) {
    tailParts.push(
      "Operator Notes:\n" +
        args.volatileTail.operatorNotes.map((n) => `[Note]: ${n}`).join("\n"),
    )
  }

  tailParts.push(
    args.volatileTail.currentTrigger?.trim() ||
      `Write your next response or tool call as @${args.agent.handle}.`,
  )

  const tailMessage: UserModelMessage = {
    role: "user",
    content: tailParts.join("\n\n"),
  }

  const prefixString = JSON.stringify(prefix)

  return {
    messages: [...prefix, tailMessage],
    prefix,
    tail: tailMessage,
    prefixString,
  }
}
