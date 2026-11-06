import { z } from "zod"
import {
  castVote,
  claimTask,
  CollabError,
  createTask,
  listTasks,
  requestHumanDecision,
  startVote,
  updateTask,
  type CollabAgent,
} from "../../collab"
import type { ToolSpec } from "../audited"

const statusSchema = z.enum(["open", "in_progress", "stuck", "done"])

async function friendly<T>(run: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof CollabError) return { error: error.message }
    throw error
  }
}

/**
 * Board, decision and vote tools for built-in agents. They share their logic with
 * the MCP server so an LLM agent and a bot in someone's ChatGPT see the same rules.
 */
export function taskTools(args: {
  roomId: string
  orgId: string
  agentId: string
  handle: string
}): ToolSpec[] {
  const agent: CollabAgent = { agentId: args.agentId, orgId: args.orgId, handle: args.handle }
  const handoff =
    " To get a teammate to act on it during this turn, also mention them with @handle in your reply."
  return [
    {
      name: "list_tasks",
      description:
        "List tasks and requests on this room's board. Use it before creating duplicates or when a human asks what is still open.",
      schema: z.object({ status: statusSchema.optional(), mine: z.boolean().optional() }),
      dangerous: false,
      execute: (input: { status?: z.infer<typeof statusSchema>; mine?: boolean }) =>
        friendly(() => listTasks(agent, { roomId: args.roomId, ...input })),
    },
    {
      name: "create_task",
      description:
        "Create a task on this room's board. Break large goals into several tasks; set assign_to_me false to leave a task for a teammate to claim.",
      schema: z.object({
        title: z.string().min(2).max(120),
        description: z.string().max(4_000).optional(),
        assign_to_me: z.boolean().optional(),
      }),
      dangerous: false,
      execute: (input: { title: string; description?: string; assign_to_me?: boolean }) =>
        friendly(() =>
          createTask(agent, {
            roomId: args.roomId,
            title: input.title,
            description: input.description,
            assignToMe: input.assign_to_me,
          }),
        ),
    },
    {
      name: "claim_task",
      description:
        "Claim an unassigned task before you start on it. Fails safely, telling you who holds it, if another agent got there first.",
      schema: z.object({ task_id: z.string().uuid() }),
      dangerous: false,
      execute: (input: { task_id: string }) => friendly(() => claimTask(agent, { taskId: input.task_id })),
    },
    {
      name: "update_task",
      description:
        "Report progress on a task you hold: status, a progress note, or release it. Status \"stuck\" posts a help request for ask_help_from (or all bots) and alerts the humans." +
        handoff,
      schema: z.object({
        task_id: z.string().uuid(),
        status: statusSchema.optional(),
        note: z.string().max(4_000).optional(),
        ask_help_from: z.string().optional(),
        release: z.boolean().optional(),
      }),
      dangerous: false,
      execute: (input: {
        task_id: string
        status?: z.infer<typeof statusSchema>
        note?: string
        ask_help_from?: string
        release?: boolean
      }) =>
        friendly(() =>
          updateTask(agent, {
            taskId: input.task_id,
            status: input.status,
            note: input.note,
            askHelpFrom: input.ask_help_from,
            release: input.release,
          }),
        ),
    },
    {
      name: "request_human_decision",
      description:
        "Check with the humans first. Puts a decision card in their Inbox for anything high-stakes, costly, irreversible or unclear. Give 2–6 short options so they can answer in one tap. Do not wait in this turn: continue with other work; the answer arrives as a message that mentions you.",
      schema: z.object({
        question: z.string().min(4).max(120),
        details: z.string().max(4_000).optional(),
        options: z.array(z.string().min(1).max(60)).max(6).optional(),
      }),
      dangerous: false,
      execute: (input: { question: string; details?: string; options?: string[] }) =>
        friendly(() => requestHumanDecision(agent, { roomId: args.roomId, ...input })),
    },
    {
      name: "start_vote",
      description:
        "Ask the other agents to vote between approaches. Returns a vote_id they use with cast_vote." + handoff,
      schema: z.object({
        question: z.string().min(4).max(300),
        options: z.array(z.string().min(1).max(120)).min(2).max(8),
      }),
      dangerous: false,
      execute: (input: { question: string; options: string[] }) =>
        friendly(() => startVote(agent, { roomId: args.roomId, ...input })),
    },
    {
      name: "cast_vote",
      description: "Vote on an open vote by option text or 1-based number, with a one-line reason.",
      schema: z.object({
        vote_id: z.string().uuid(),
        option: z.string().min(1),
        reason: z.string().max(500).optional(),
      }),
      dangerous: false,
      execute: (input: { vote_id: string; option: string; reason?: string }) =>
        friendly(() => castVote(agent, { voteId: input.vote_id, option: input.option, reason: input.reason })),
    },
  ]
}
