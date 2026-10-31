import { and, desc, eq, ne } from "drizzle-orm"
import { z } from "zod"
import { tasks } from "@mesh/db"
import { getDb } from "../../db"
import type { ToolSpec } from "../audited"

const statusSchema = z.enum(["open", "in_progress", "stuck", "done"])

/**
 * Task tools let an agent leave work on the room's board and ask the humans for
 * a decision without blocking its turn. Requests show up in the Inbox.
 */
export function taskTools(args: { roomId: string; orgId: string; agentId: string }): ToolSpec[] {
  return [
    {
      name: "list_tasks",
      description:
        "List tasks and requests on this room's board. Use it before creating duplicates or when a human asks what is still open.",
      schema: z.object({
        status: statusSchema.optional(),
        mine: z.boolean().optional(),
      }),
      dangerous: false,
      execute: async (input: { status?: z.infer<typeof statusSchema>; mine?: boolean }) => {
        const conditions = [eq(tasks.roomId, args.roomId)]
        if (input.status) conditions.push(eq(tasks.status, input.status))
        if (input.mine) conditions.push(eq(tasks.assigneeAgentId, args.agentId))
        const rows = await getDb()
          .select({
            id: tasks.id,
            number: tasks.number,
            kind: tasks.kind,
            title: tasks.title,
            description: tasks.description,
            status: tasks.status,
            assigneeAgentId: tasks.assigneeAgentId,
            requestedByAgentId: tasks.requestedByAgentId,
            updatedAt: tasks.updatedAt,
          })
          .from(tasks)
          .where(and(...conditions))
          .orderBy(desc(tasks.updatedAt))
          .limit(25)
        return rows.map((row) => ({
          ...row,
          mine: row.assigneeAgentId === args.agentId,
        }))
      },
    },
    {
      name: "create_task",
      description:
        "Create a task on this room's board, or a request that waits in the humans' Inbox. Use a request when you need a human decision or approval. Do not use this for casual conversation.",
      schema: z.object({
        title: z.string().min(2).max(120),
        description: z.string().max(4_000).optional(),
        kind: z.enum(["task", "request"]).optional(),
        assign_to_me: z.boolean().optional(),
      }),
      dangerous: false,
      execute: async (input: {
        title: string
        description?: string
        kind?: "task" | "request"
        assign_to_me?: boolean
      }) => {
        const kind = input.kind ?? "task"
        const assignToMe = input.assign_to_me ?? true
        const [row] = await getDb()
          .insert(tasks)
          .values({
            orgId: args.orgId,
            roomId: args.roomId,
            kind,
            title: input.title,
            description: input.description ?? "",
            status: "open",
            assigneeAgentId: kind === "task" && assignToMe ? args.agentId : null,
            requestedByAgentId: kind === "request" ? args.agentId : null,
            metadata: { source: "agent", createdByAgent: args.agentId },
          })
          .returning({ id: tasks.id, number: tasks.number, kind: tasks.kind, title: tasks.title })
        if (!row) throw new Error("could not create the task")
        return row
      },
    },
    {
      name: "update_task",
      description:
        "Update a task on this room's board. Use it to report progress, mark work stuck or done, or claim a task.",
      schema: z.object({
        task_id: z.string().uuid(),
        status: statusSchema.optional(),
        assign_to_me: z.boolean().optional(),
      }),
      dangerous: false,
      execute: async (input: {
        task_id: string
        status?: z.infer<typeof statusSchema>
        assign_to_me?: boolean
      }) => {
        const updates: Record<string, unknown> = { updatedAt: new Date() }
        if (input.status) updates.status = input.status
        if (input.assign_to_me !== undefined) {
          updates.assigneeAgentId = input.assign_to_me ? args.agentId : null
        }
        const [row] = await getDb()
          .update(tasks)
          .set(updates)
          .where(and(eq(tasks.id, input.task_id), eq(tasks.roomId, args.roomId), ne(tasks.status, "done")))
          .returning({ id: tasks.id, number: tasks.number, status: tasks.status, title: tasks.title })
        if (!row) throw new Error("task not found in this room")
        return row
      },
    },
  ]
}
