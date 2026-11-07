import { z } from "zod"
import type { ToolSpec } from "../tools/audited"
import { getMemoryService } from "./service"

export interface MemoryToolsArgs {
  orgId: string
  agentId: string
  roomId: string
}

export function memoryTools(args: MemoryToolsArgs): ToolSpec[] {
  const service = getMemoryService()
  const { orgId, agentId, roomId } = args

  const rememberTool: ToolSpec = {
    name: "remember",
    description:
      "Save a durable fact, user preference, architecture decision, or procedure to memory across turns and rooms.",
    schema: z.object({
      title: z.string().min(1).max(200),
      body: z.string().min(1).max(2048),
      scope: z.enum(["agent", "room", "org"]).default("agent"),
      kind: z.enum(["fact", "preference", "decision", "procedure", "episode"]).default("fact"),
      tags: z.array(z.string()).optional(),
      pinned: z.boolean().optional(),
    }),
    dangerous: false,
    execute: async (input: {
      title: string
      body: string
      scope: "agent" | "room" | "org"
      kind: "fact" | "preference" | "decision" | "procedure" | "episode"
      tags?: string[]
      pinned?: boolean
    }) => {
      const memory = await service.write({
        orgId,
        scope: input.scope,
        agentId: input.scope === "agent" ? agentId : null,
        roomId: input.scope === "room" ? roomId : null,
        kind: input.kind,
        title: input.title,
        body: input.body,
        tags: input.tags,
        pinned: input.pinned,
        createdByAgentId: agentId,
      })

      if (!memory) {
        throw new Error("Failed to save memory")
      }

      return {
        ok: true,
        id: memory.id,
        title: memory.title,
        scope: memory.scope,
      }
    },
  }

  const recallTool: ToolSpec = {
    name: "recall",
    description:
      "Search memory across agent, room, and org scopes using semantic/keyword matching.",
    schema: z.object({
      query: z.string().min(1),
      scope: z.enum(["agent", "room", "org"]).optional(),
      limit: z.number().int().positive().max(20).optional().default(8),
    }),
    dangerous: false,
    execute: async (input: {
      query: string
      scope?: "agent" | "room" | "org"
      limit?: number
    }) => {
      const matches = await service.recall({
        orgId,
        query: input.query,
        scope: input.scope,
        agentId,
        roomId,
        limit: input.limit,
      })

      return {
        query: input.query,
        count: matches.length,
        memories: matches.map((m) => ({
          id: m.id,
          scope: m.scope,
          title: m.title,
          body: m.body,
          kind: m.kind,
        })),
      }
    },
  }

  const forgetTool: ToolSpec = {
    name: "forget",
    description: "Delete or deprecate a memory item by its ID.",
    schema: z.object({
      id: z.string().uuid(),
    }),
    dangerous: false,
    execute: async (input: { id: string }) => {
      const success = await service.forget(input.id, orgId)
      return {
        ok: success,
        id: input.id,
      }
    },
  }

  return [rememberTool, recallTool, forgetTool]
}
