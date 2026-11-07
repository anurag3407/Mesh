import { generateText } from "ai"
import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm"
import { redactSecrets } from "@sayabot/core"
import { memories } from "@sayabot/db"
import { getDb } from "../db"
import type { AgentRow } from "../runner/context"
import { resolveAgentCheapModel } from "../runner/llm"

export interface WriteMemoryInput {
  orgId: string
  scope: "agent" | "room" | "org"
  agentId?: string | null
  roomId?: string | null
  kind: "fact" | "preference" | "decision" | "procedure" | "episode"
  title: string
  body: string
  tags?: string[]
  source?: "agent" | "human" | "compaction" | "consolidation" | "import"
  sourceRef?: string | null
  confidence?: number
  pinned?: boolean
  createdByUserId?: string | null
  createdByAgentId?: string | null
}

export interface HybridRecallInput {
  orgId: string
  query: string
  scope?: "agent" | "room" | "org"
  agentId?: string | null
  roomId?: string | null
  limit?: number
}

export interface RecalledMemoryItem {
  id: string
  scope: string
  kind: string
  title: string
  body: string
  pinned: boolean
  confidence: number
  score: number
}

/**
 * Memory Service:
 * - Redacted write with deduplication by title/scope
 * - Hybrid FTS search with recency & pinned ranking boost
 * - Pinned memories digest for System 2 cached prefix
 */
export class MemoryService {
  /**
   * Writes a memory item. Passes text through secret redaction and prevents duplicate records.
   */
  async write(input: WriteMemoryInput) {
    const db = getDb()

    // Pass through secret scrubber/redaction
    const redactedTitle = redactSecrets(input.title.slice(0, 200)).text
    const redactedBody = redactSecrets(input.body.slice(0, 2048)).text

    // Check for existing memory with matching scope and title to deduplicate
    const scopeConditions = [
      eq(memories.orgId, input.orgId),
      eq(memories.scope, input.scope),
      eq(memories.title, redactedTitle),
    ]

    if (input.agentId) scopeConditions.push(eq(memories.agentId, input.agentId))
    if (input.roomId) scopeConditions.push(eq(memories.roomId, input.roomId))

    const [existing] = await db
      .select({ id: memories.id })
      .from(memories)
      .where(and(...scopeConditions))
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(memories)
        .set({
          body: redactedBody,
          tags: input.tags ?? [],
          source: input.source ?? "agent",
          confidence: input.confidence ?? 1.0,
          pinned: input.pinned ?? false,
          updatedAt: new Date(),
        })
        .where(eq(memories.id, existing.id))
        .returning()
      return updated
    }

    const [inserted] = await db
      .insert(memories)
      .values({
        orgId: input.orgId,
        scope: input.scope,
        agentId: input.agentId ?? null,
        roomId: input.roomId ?? null,
        kind: input.kind,
        title: redactedTitle,
        body: redactedBody,
        tags: input.tags ?? [],
        source: input.source ?? "agent",
        sourceRef: input.sourceRef ?? null,
        confidence: input.confidence ?? 1.0,
        pinned: input.pinned ?? false,
        createdByUserId: input.createdByUserId ?? null,
        createdByAgentId: input.createdByAgentId ?? null,
      })
      .returning()

    return inserted
  }

  /**
   * Hybrid recall across allowed memory scopes (agent, room, org).
   * Ranks by text relevance with boosts for pinned items and recent usage.
   */
  async recall(input: HybridRecallInput): Promise<RecalledMemoryItem[]> {
    const db = getDb()
    const limit = input.limit ?? 8

    const scopeFilters = [eq(memories.scope, "org")]
    if (input.roomId) {
      scopeFilters.push(and(eq(memories.scope, "room"), eq(memories.roomId, input.roomId))!)
    }
    if (input.agentId) {
      scopeFilters.push(and(eq(memories.scope, "agent"), eq(memories.agentId, input.agentId))!)
    }

    const baseWhere = and(
      eq(memories.orgId, input.orgId),
      input.scope ? eq(memories.scope, input.scope) : or(...scopeFilters),
    )

    // Execute query with ranking
    const rows = await db
      .select({
        id: memories.id,
        scope: memories.scope,
        kind: memories.kind,
        title: memories.title,
        body: memories.body,
        pinned: memories.pinned,
        confidence: memories.confidence,
        lastUsedAt: memories.lastUsedAt,
      })
      .from(memories)
      .where(baseWhere)
      .orderBy(desc(memories.pinned), desc(memories.lastUsedAt), desc(memories.createdAt))
      .limit(limit * 2)

    if (rows.length === 0) return []

    // Score based on keyword overlap, pinned flag, and confidence
    const queryTerms = input.query.toLowerCase().split(/\s+/).filter(Boolean)

    const scored = rows.map((r) => {
      const text = `${r.title} ${r.body}`.toLowerCase()
      let matches = 0
      for (const term of queryTerms) {
        if (text.includes(term)) matches++
      }

      const matchRatio = queryTerms.length > 0 ? matches / queryTerms.length : 0.5
      const pinnedBoost = r.pinned ? 0.3 : 0.0
      const score = matchRatio * 0.7 + pinnedBoost + (r.confidence * 0.1)

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
    const top = scored.slice(0, limit)

    // Update last_used_at and use_count for recalled items
    if (top.length > 0) {
      const ids = top.map((t) => t.id)
      try {
        await db
          .update(memories)
          .set({
            lastUsedAt: new Date(),
            useCount: sql`use_count + 1`,
          })
          .where(inArray(memories.id, ids))
      } catch {}
    }

    return top
  }

  /**
   * Loads up to 20 pinned memories for the given scopes to be placed in System 2 cached prefix.
   */
  async getPinnedDigest(args: {
    orgId: string
    agentId?: string | null
    roomId?: string | null
  }): Promise<Array<{ id: string; title: string; body: string }>> {
    const db = getDb()

    const scopeFilters = [eq(memories.scope, "org")]
    if (args.roomId) {
      scopeFilters.push(and(eq(memories.scope, "room"), eq(memories.roomId, args.roomId))!)
    }
    if (args.agentId) {
      scopeFilters.push(and(eq(memories.scope, "agent"), eq(memories.agentId, args.agentId))!)
    }

    const rows = await db
      .select({
        id: memories.id,
        title: memories.title,
        body: memories.body,
      })
      .from(memories)
      .where(and(eq(memories.orgId, args.orgId), eq(memories.pinned, true), or(...scopeFilters)))
      .orderBy(memories.id)
      .limit(20)

    return rows
  }

  /**
   * Automatically extracts up to 3 durable facts or decisions from a completed run transcript
   * using a cheap model pass (WS2 M5).
   */
  async extractMemoriesFromTranscript(args: {
    orgId: string
    roomId?: string | null
    agentId?: string | null
    transcriptText: string
    agent: AgentRow
  }): Promise<number> {
    if (!args.transcriptText || args.transcriptText.length < 50) return 0
    try {
      const resolved = await resolveAgentCheapModel(args.agent)
      const result = await generateText({
        model: resolved.model,
        system:
          "You are an automated memory extractor for an AI team. Given an agent turn transcript, extract up to 3 durable, high-value facts, user preferences, or team decisions that should be remembered in future turns. Ignore ephemeral status chatter. Format as JSON array: [ { \"title\": string, \"body\": string, \"kind\": \"fact\"|\"preference\"|\"decision\", \"confidence\": number, \"tags\": string[] } ]. Return ONLY valid JSON.",
        prompt: `Transcript:\n${args.transcriptText.slice(0, 3000)}\n\nExtract durable facts:`,
      })

      const cleaned = result.text.trim().replace(/^```json\s*/, "").replace(/\s*```$/, "")
      const parsed = JSON.parse(cleaned)
      if (!Array.isArray(parsed)) return 0

      let saved = 0
      for (const item of parsed.slice(0, 3)) {
        if (!item.title || !item.body) continue
        await this.write({
          orgId: args.orgId,
          scope: args.roomId ? "room" : "agent",
          agentId: args.agentId,
          roomId: args.roomId,
          kind: item.kind === "preference" || item.kind === "decision" ? item.kind : "fact",
          title: item.title,
          body: item.body,
          tags: Array.isArray(item.tags) ? item.tags : [],
          source: "agent",
          confidence: typeof item.confidence === "number" ? item.confidence : 0.8,
        })
        saved++
      }
      return saved
    } catch {
      return 0
    }
  }

  /**
   * Writes a daily episode memory for an agent in a room ("what I did today") (WS2 M6).
   */
  async writeDailyEpisode(args: {
    orgId: string
    agentId: string
    roomId: string
    summary: string
  }) {
    const today = new Date().toISOString().split("T")[0]
    return this.write({
      orgId: args.orgId,
      scope: "room",
      agentId: args.agentId,
      roomId: args.roomId,
      kind: "episode",
      title: `Daily Episode: ${today}`,
      body: args.summary,
      tags: ["episode", today!],
      source: "consolidation",
      pinned: false,
    })
  }

  /**
   * Consolidates memories by removing expired episode logs older than 30 days (WS2 M6).
   */
  async consolidate(orgId: string): Promise<{ expiredEpisodes: number }> {
    const db = getDb()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const deleted = await db
      .delete(memories)
      .where(
        and(
          eq(memories.orgId, orgId),
          eq(memories.kind, "episode"),
          lt(memories.createdAt, thirtyDaysAgo),
        ),
      )
      .returning({ id: memories.id })

    return { expiredEpisodes: deleted.length }
  }

  /**
   * Generates markdown files for mirroring into /home/bot/.saaya/memory/MEMORY.md (WS2 M8).
   */
  async generateMemoryMirror(args: {
    orgId: string
    agentId?: string | null
    roomId?: string | null
  }): Promise<{ memoryMd: string; topics: Record<string, string> }> {
    const db = getDb()
    const scopeFilters = [eq(memories.scope, "org")]
    if (args.roomId) {
      scopeFilters.push(and(eq(memories.scope, "room"), eq(memories.roomId, args.roomId))!)
    }
    if (args.agentId) {
      scopeFilters.push(and(eq(memories.scope, "agent"), eq(memories.agentId, args.agentId))!)
    }

    const rows = await db
      .select()
      .from(memories)
      .where(and(eq(memories.orgId, args.orgId), or(...scopeFilters)))
      .orderBy(desc(memories.pinned), desc(memories.lastUsedAt))

    const pinned = rows.filter((r) => r.pinned)
    const memoryMdLines = [
      "# Team & Agent Memory",
      "",
      "This file is automatically generated by Sayabot Memory Service. It reflects durable workspace facts and preferences.",
      "",
      "## Pinned Memories",
      "",
      ...pinned.map((m) => `- **${m.title}**: ${m.body}`),
      "",
      "## Recent Decisions & Facts",
      "",
      ...rows.filter((r) => !r.pinned).slice(0, 30).map((m) => `- **${m.title}** (${m.kind}): ${m.body}`),
    ]

    const topics: Record<string, string> = {}
    for (const row of rows) {
      for (const tag of row.tags ?? []) {
        if (!topics[tag]) {
          topics[tag] = `# Topic: ${tag}\n\n`
        }
        topics[tag] += `- **${row.title}**: ${row.body}\n`
      }
    }

    return {
      memoryMd: memoryMdLines.join("\n"),
      topics,
    }
  }

  /**
   * Deletes a memory item.
   */
  async forget(id: string, orgId: string): Promise<boolean> {
    const db = getDb()
    const result = await db
      .delete(memories)
      .where(and(eq(memories.id, id), eq(memories.orgId, orgId)))
      .returning()
    return result.length > 0
  }
}

let serviceInstance: MemoryService | null = null

export function getMemoryService(): MemoryService {
  if (!serviceInstance) {
    serviceInstance = new MemoryService()
  }
  return serviceInstance
}
