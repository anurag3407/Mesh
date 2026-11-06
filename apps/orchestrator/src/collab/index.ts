import { extractHandles, redactSecrets, resolveMentions } from "@mesh/core"
import {
  agentReads,
  agentRuns,
  agents,
  messages,
  roomAgents,
  rooms,
  taskComments,
  tasks,
} from "@mesh/db"
import { and, asc, desc, eq, gt, gte, inArray, isNull, ne, or, sql } from "drizzle-orm"
import { notifyBotReply } from "../bot-reply"
import { getDb } from "../db"
import { notifyHumansNeeded } from "../push"
import { broadcast } from "../realtime"
import { loadConversation, loadRoomAgents, type ContextMessage } from "../runner/context"

/**
 * Collaboration primitives shared by MCP-connected bots and built-in LLM agents:
 * posting, inbox/read cursors, atomic task claims, "stuck → ask a teammate",
 * human decisions with quick-reply options, and agent votes.
 */

export interface CollabAgent {
  agentId: string
  orgId: string
  handle: string
}

export class CollabError extends Error {}

/** Bot-to-bot chains started by agent posts are capped per room per 10 minutes. */
const AGENT_TRIGGER_LIMIT = 8
const AGENT_TRIGGER_WINDOW_MS = 10 * 60_000

type Enqueue = (roomId: string, messageId: string) => Promise<void>
let enqueueRoomMessage: Enqueue | null = null

/** Wired from index.ts once the job queue is up (avoids an import cycle). */
export function setCollabEnqueue(fn: Enqueue): void {
  enqueueRoomMessage = fn
}

// ── rooms ────────────────────────────────────────────────────────────────

export async function agentRooms(agent: CollabAgent) {
  return getDb()
    .select({ id: rooms.id, name: rooms.name, kind: rooms.kind, directive: rooms.systemDirective })
    .from(roomAgents)
    .innerJoin(rooms, eq(rooms.id, roomAgents.roomId))
    .where(and(eq(roomAgents.agentId, agent.agentId), eq(rooms.orgId, agent.orgId)))
    .orderBy(asc(rooms.name))
}

export async function assertAgentRoom(agent: CollabAgent, roomId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(roomId)) throw new CollabError("room not found")
  const [row] = await getDb()
    .select({ roomId: roomAgents.roomId })
    .from(roomAgents)
    .innerJoin(rooms, eq(rooms.id, roomAgents.roomId))
    .where(
      and(
        eq(roomAgents.roomId, roomId),
        eq(roomAgents.agentId, agent.agentId),
        eq(rooms.orgId, agent.orgId),
      ),
    )
    .limit(1)
  if (!row) throw new CollabError("you are not a member of this room")
}

async function markRead(agentId: string, roomId: string, at = new Date()): Promise<void> {
  await getDb()
    .insert(agentReads)
    .values({ agentId, roomId, lastReadAt: at, updatedAt: at })
    .onConflictDoUpdate({
      target: [agentReads.agentId, agentReads.roomId],
      set: { lastReadAt: at, updatedAt: at },
    })
}

async function readCursors(agentId: string): Promise<Map<string, Date>> {
  const rows = await getDb()
    .select({ roomId: agentReads.roomId, lastReadAt: agentReads.lastReadAt })
    .from(agentReads)
    .where(eq(agentReads.agentId, agentId))
  return new Map(rows.map((r) => [r.roomId, r.lastReadAt]))
}

function compact(m: ContextMessage) {
  return {
    id: m.id,
    from:
      m.senderType === "agent"
        ? `@${m.senderHandle ?? "agent"}`
        : m.senderType === "system"
          ? "system"
          : m.senderName,
    sender_type: m.senderType,
    content: m.content,
    status: m.status,
    at: m.createdAt,
  }
}

export async function getRoomMessages(
  agent: CollabAgent,
  args: { roomId: string; threadId?: string | null; limit?: number; markAsRead?: boolean },
) {
  await assertAgentRoom(agent, args.roomId)
  const conversation = await loadConversation({
    roomId: args.roomId,
    threadRootId: args.threadId ?? null,
    limit: Math.min(Math.max(args.limit ?? 30, 1), 100),
  })
  if (args.markAsRead !== false) await markRead(agent.agentId, args.roomId)
  return conversation.map(compact)
}

/**
 * Everything that needs this agent's attention since it last looked: messages that
 * mention it (or @all_bots), bot DMs to it, its open tasks, and answered requests.
 */
export async function getInbox(agent: CollabAgent, args: { markAsRead?: boolean } = {}) {
  const db = getDb()
  const roomList = await agentRooms(agent)
  if (roomList.length === 0) return { rooms: [], mentions: [], tasks: [], answered_requests: [] }
  const roomIds = roomList.map((r) => r.id)
  const cursors = await readCursors(agent.agentId)
  const oldest = new Date(Date.now() - 7 * 86_400_000)
  const handle = agent.handle.toLowerCase()

  const candidates = await db
    .select({
      id: messages.id,
      roomId: messages.roomId,
      threadRootId: messages.threadRootId,
      senderType: messages.senderType,
      senderId: messages.senderId,
      content: messages.content,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      and(
        inArray(messages.roomId, roomIds),
        gte(messages.createdAt, oldest),
        ne(messages.status, "streaming"),
        or(
          sql`${messages.mentions} && array[${handle}, 'all_bots']::text[]`,
          sql`${messages.metadata}->>'dmToAgentId' = ${agent.agentId}`,
        ),
        or(isNull(messages.senderId), ne(messages.senderId, agent.agentId)),
      ),
    )
    .orderBy(asc(messages.createdAt))
    .limit(200)

  const unread = candidates.filter((m) => {
    const cursor = cursors.get(m.roomId)
    return !cursor || m.createdAt > cursor
  })

  const senderAgentIds = [
    ...new Set(unread.filter((m) => m.senderType === "agent" && m.senderId).map((m) => m.senderId!)),
  ]
  const senderAgents = senderAgentIds.length
    ? await db
        .select({ id: agents.id, handle: agents.handle })
        .from(agents)
        .where(inArray(agents.id, senderAgentIds))
    : []
  const handles = new Map(senderAgents.map((a) => [a.id, a.handle]))
  const roomNames = new Map(roomList.map((r) => [r.id, r.name]))

  const myTasks = await db
    .select({
      id: tasks.id,
      number: tasks.number,
      roomId: tasks.roomId,
      title: tasks.title,
      status: tasks.status,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(
      and(
        inArray(tasks.roomId, roomIds),
        eq(tasks.kind, "task"),
        ne(tasks.status, "done"),
        or(eq(tasks.assigneeAgentId, agent.agentId), isNull(tasks.assigneeAgentId)),
        isNull(tasks.assigneeUserId),
      ),
    )
    .orderBy(desc(tasks.updatedAt))
    .limit(30)

  const answered = await db
    .select({
      id: tasks.id,
      number: tasks.number,
      roomId: tasks.roomId,
      title: tasks.title,
      metadata: tasks.metadata,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.requestedByAgentId, agent.agentId),
        eq(tasks.kind, "request"),
        eq(tasks.status, "done"),
        gt(tasks.updatedAt, new Date(Date.now() - 2 * 86_400_000)),
      ),
    )
    .orderBy(desc(tasks.updatedAt))
    .limit(10)

  if (args.markAsRead !== false) {
    const now = new Date()
    await Promise.all(roomIds.map((id) => markRead(agent.agentId, id, now)))
  }

  return {
    rooms: roomList.map((r) => ({ id: r.id, name: r.name })),
    mentions: unread.map((m) => ({
      id: m.id,
      room_id: m.roomId,
      room: roomNames.get(m.roomId) ?? "",
      thread_id: m.threadRootId,
      from:
        m.senderType === "agent"
          ? `@${handles.get(m.senderId ?? "") ?? "agent"}`
          : m.senderType === "system"
            ? "system"
            : "human",
      direct_message: m.metadata?.dmToAgentId === agent.agentId,
      content: m.content.slice(0, 4_000),
      at: m.createdAt.toISOString(),
    })),
    tasks: myTasks.map((t) => ({
      id: t.id,
      ref: `MESH-${t.number}`,
      room_id: t.roomId,
      title: t.title,
      status: t.status,
      claimable: true,
    })),
    answered_requests: answered.map((r) => ({
      id: r.id,
      ref: `MESH-${r.number}`,
      room_id: r.roomId,
      question: r.title,
      answer: typeof r.metadata.answer === "string" ? r.metadata.answer : null,
      answered_at: typeof r.metadata.answeredAt === "string" ? r.metadata.answeredAt : null,
    })),
  }
}

// ── posting ──────────────────────────────────────────────────────────────

async function agentIsTakingTurn(agentId: string, roomId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: agentRuns.id })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.agentId, agentId),
        eq(agentRuns.roomId, roomId),
        eq(agentRuns.status, "running"),
        gte(agentRuns.createdAt, new Date(Date.now() - 5 * 60_000)),
      ),
    )
    .limit(1)
  return Boolean(row)
}

async function recentAgentTriggers(roomId: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        eq(messages.roomId, roomId),
        gte(messages.createdAt, new Date(Date.now() - AGENT_TRIGGER_WINDOW_MS)),
        sql`${messages.metadata}->>'agentTrigger' = 'true'`,
      ),
    )
  return row?.count ?? 0
}

/**
 * Posts as an agent outside a coordinator turn. When the message mentions other
 * agents in the room, it starts a bot-to-bot turn session for them, bounded by
 * the room's breakers and a per-room chain limit.
 */
export async function postAgentMessage(
  agent: CollabAgent,
  args: {
    roomId: string
    content: string
    threadRootId?: string | null
    metadata?: Record<string, unknown>
  },
) {
  await assertAgentRoom(agent, args.roomId)
  const content = redactSecrets(args.content).text.trim()
  if (!content) throw new CollabError("message is empty")
  if (content.length > 32_000) throw new CollabError("message is too long (32k characters max)")

  const mentions = extractHandles(content)
  const roomAgentRows = await loadRoomAgents(args.roomId)
  const targets = resolveMentions(
    content,
    roomAgentRows.map(({ agent: a }) => ({ id: a.id, handle: a.handle, kind: a.kind })),
  ).filter((a) => a.id !== agent.agentId)

  const inTurn = await agentIsTakingTurn(agent.agentId, args.roomId)
  let trigger = !inTurn && targets.length > 0
  let throttled = false
  if (trigger && (await recentAgentTriggers(args.roomId)) >= AGENT_TRIGGER_LIMIT) {
    trigger = false
    throttled = true
  }

  const [row] = await getDb()
    .insert(messages)
    .values({
      roomId: args.roomId,
      threadRootId: args.threadRootId ?? null,
      senderType: "agent",
      senderId: agent.agentId,
      content,
      status: "complete",
      mentions,
      metadata: {
        external: true,
        agentHandle: agent.handle,
        ...(args.metadata ?? {}),
        ...(trigger ? { agentTrigger: true } : {}),
      },
    })
    .returning({ id: messages.id, createdAt: messages.createdAt })
  if (!row) throw new CollabError("failed to store message")

  await notifyBotReply({
    roomId: args.roomId,
    agentId: agent.agentId,
    threadRootId: args.threadRootId ?? null,
    messageId: row.id,
  })
  await broadcast(args.roomId, { type: "message.done", messageId: row.id, status: "complete" })
  await markRead(agent.agentId, args.roomId, row.createdAt)
  if (trigger && enqueueRoomMessage) await enqueueRoomMessage(args.roomId, row.id)

  return {
    message_id: row.id,
    woke: trigger ? targets.map((t) => `@${t.handle}`) : [],
    ...(throttled
      ? {
          note: "Too many bot-to-bot chains in this room in the last 10 minutes; mentioned agents will see this in their inbox but were not woken.",
        }
      : {}),
  }
}

/** A direct message to one teammate bot. Humans in the room can always read it. */
export async function sendBotDirectMessage(
  agent: CollabAgent,
  args: { roomId: string; toHandle: string; content: string },
) {
  await assertAgentRoom(agent, args.roomId)
  const handle = args.toHandle.replace(/^@/, "").toLowerCase()
  const roomAgentRows = await loadRoomAgents(args.roomId)
  const target = roomAgentRows.find(({ agent: a }) => a.handle.toLowerCase() === handle)?.agent
  if (!target) throw new CollabError(`@${handle} is not in this room`)
  if (target.id === agent.agentId) throw new CollabError("you cannot message yourself")
  const body = args.content.trim()
  const content = new RegExp(`(^|\\s)@${handle}\\b`, "i").test(body) ? body : `@${handle} ${body}`
  return postAgentMessage(agent, {
    roomId: args.roomId,
    content,
    metadata: { dmToAgentId: target.id, dmToHandle: target.handle, botDm: true },
  })
}

// ── tasks ────────────────────────────────────────────────────────────────

async function loadTaskInOrg(agent: CollabAgent, taskId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(taskId)) throw new CollabError("task not found")
  const [task] = await getDb()
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.orgId, agent.orgId)))
    .limit(1)
  if (!task) throw new CollabError("task not found")
  await assertAgentRoom(agent, task.roomId)
  return task
}

export async function listTasks(
  agent: CollabAgent,
  args: { roomId: string; status?: "open" | "in_progress" | "stuck" | "done"; mine?: boolean },
) {
  await assertAgentRoom(agent, args.roomId)
  const conditions = [eq(tasks.roomId, args.roomId)]
  if (args.status) conditions.push(eq(tasks.status, args.status))
  if (args.mine) conditions.push(eq(tasks.assigneeAgentId, agent.agentId))
  const rows = await getDb()
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.updatedAt))
    .limit(40)
  return rows.map((t) => ({
    id: t.id,
    ref: `MESH-${t.number}`,
    kind: t.kind,
    title: t.title,
    description: t.description.slice(0, 1_000),
    status: t.status,
    assigned_to_me: t.assigneeAgentId === agent.agentId,
    assigned: Boolean(t.assigneeAgentId || t.assigneeUserId),
    updated_at: t.updatedAt.toISOString(),
  }))
}

export async function createTask(
  agent: CollabAgent,
  args: { roomId: string; title: string; description?: string; assignToMe?: boolean },
) {
  await assertAgentRoom(agent, args.roomId)
  const [row] = await getDb()
    .insert(tasks)
    .values({
      orgId: agent.orgId,
      roomId: args.roomId,
      kind: "task",
      title: args.title.slice(0, 120),
      description: (args.description ?? "").slice(0, 4_000),
      status: args.assignToMe === false ? "open" : "in_progress",
      assigneeAgentId: args.assignToMe === false ? null : agent.agentId,
      metadata: { source: "agent", createdByAgent: agent.agentId },
    })
    .returning({ id: tasks.id, number: tasks.number, title: tasks.title, status: tasks.status })
  if (!row) throw new CollabError("could not create the task")
  return { id: row.id, ref: `MESH-${row.number}`, title: row.title, status: row.status }
}

/**
 * Claims a task only when nobody else holds it. Two bots racing for the same
 * task get one winner; the loser is told who has it.
 */
export async function claimTask(agent: CollabAgent, args: { taskId: string }) {
  const task = await loadTaskInOrg(agent, args.taskId)
  if (task.kind !== "task") throw new CollabError("requests cannot be claimed")
  const [row] = await getDb()
    .update(tasks)
    .set({ assigneeAgentId: agent.agentId, status: "in_progress", updatedAt: new Date() })
    .where(
      and(
        eq(tasks.id, task.id),
        ne(tasks.status, "done"),
        isNull(tasks.assigneeUserId),
        or(isNull(tasks.assigneeAgentId), eq(tasks.assigneeAgentId, agent.agentId)),
      ),
    )
    .returning({ id: tasks.id, number: tasks.number, title: tasks.title })
  if (!row) {
    let holder = "a human"
    if (task.assigneeAgentId) {
      const [other] = await getDb()
        .select({ handle: agents.handle })
        .from(agents)
        .where(eq(agents.id, task.assigneeAgentId))
        .limit(1)
      holder = other ? `@${other.handle}` : "another agent"
    }
    return {
      claimed: false,
      reason: task.status === "done" ? "task is already done" : `already claimed by ${holder}`,
    }
  }
  await getDb().insert(taskComments).values({
    taskId: task.id,
    authorType: "agent",
    authorId: agent.agentId,
    content: `@${agent.handle} claimed this task.`,
  })
  return { claimed: true, id: row.id, ref: `MESH-${row.number}`, title: row.title }
}

/**
 * Updates a task the agent holds. Marking it stuck posts a help request in the
 * room that wakes the chosen teammate (or every other bot) to unstick it.
 */
export async function updateTask(
  agent: CollabAgent,
  args: {
    taskId: string
    status?: "open" | "in_progress" | "stuck" | "done"
    note?: string
    askHelpFrom?: string
    release?: boolean
  },
) {
  const task = await loadTaskInOrg(agent, args.taskId)
  if (task.kind !== "task") throw new CollabError("use the Inbox flow for requests")
  // Helping a stuck teammate is allowed; overwriting someone's active task is not.
  if (task.assigneeAgentId && task.assigneeAgentId !== agent.agentId && task.status !== "stuck") {
    throw new CollabError("this task belongs to another agent; claim it first")
  }
  const updates: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() }
  if (args.status) updates.status = args.status
  if (args.release) {
    updates.assigneeAgentId = null
    if (!args.status) updates.status = "open"
  }
  const [row] = await getDb()
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, task.id))
    .returning({ id: tasks.id, number: tasks.number, status: tasks.status, title: tasks.title })
  if (!row) throw new CollabError("task not found")
  const note = args.note?.trim()
  if (note) {
    await getDb().insert(taskComments).values({
      taskId: task.id,
      authorType: "agent",
      authorId: agent.agentId,
      content: note.slice(0, 4_000),
    })
  }

  let helpMessage: Awaited<ReturnType<typeof postAgentMessage>> | null = null
  if (args.status === "stuck") {
    const helper = args.askHelpFrom?.replace(/^@/, "").toLowerCase()
    const who = helper ? `@${helper}` : "@all_bots"
    helpMessage = await postAgentMessage(agent, {
      roomId: task.roomId,
      content: `${who} I'm stuck on **MESH-${row.number}: ${row.title}**.${note ? `\n\n${note}` : ""}\n\nCan you take a look or suggest a way forward?`,
      metadata: { taskId: task.id, stuckHelp: true },
    }).catch(() => null)
    notifyHumansNeeded({
      roomId: task.roomId,
      agentId: agent.agentId,
      kind: "request",
      detail: `Stuck on MESH-${row.number}: ${row.title}`,
    })
  }
  return {
    id: row.id,
    ref: `MESH-${row.number}`,
    status: row.status,
    ...(helpMessage ? { asked_for_help: helpMessage.woke } : {}),
  }
}

// ── human decisions ─────────────────────────────────────────────────────

export async function requestHumanDecision(
  agent: CollabAgent,
  args: { roomId: string; question: string; details?: string; options?: string[] },
) {
  await assertAgentRoom(agent, args.roomId)
  const options = [...new Set((args.options ?? []).map((o) => o.trim()).filter(Boolean))].slice(0, 6)
  const [row] = await getDb()
    .insert(tasks)
    .values({
      orgId: agent.orgId,
      roomId: args.roomId,
      kind: "request",
      title: args.question.slice(0, 120),
      description: (args.details ?? "").slice(0, 4_000),
      status: "open",
      requestedByAgentId: agent.agentId,
      metadata: { source: "agent", createdByAgent: agent.agentId, options },
    })
    .returning({ id: tasks.id, number: tasks.number })
  if (!row) throw new CollabError("could not create the request")
  notifyHumansNeeded({ roomId: args.roomId, agentId: agent.agentId, kind: "request", detail: args.question })
  return {
    request_id: row.id,
    ref: `MESH-${row.number}`,
    status: "waiting_for_human",
    next: "Keep working on anything that does not depend on this. The answer arrives as a message mentioning you, and get_request_status returns it.",
  }
}

export async function getRequestStatus(agent: CollabAgent, args: { requestId: string }) {
  const task = await loadTaskInOrg(agent, args.requestId)
  if (task.kind !== "request") throw new CollabError("not a request")
  return {
    request_id: task.id,
    ref: `MESH-${task.number}`,
    question: task.title,
    status: task.status === "done" ? "answered" : "waiting_for_human",
    answer: typeof task.metadata.answer === "string" ? task.metadata.answer : null,
    answered_at: typeof task.metadata.answeredAt === "string" ? task.metadata.answeredAt : null,
  }
}

// ── votes ───────────────────────────────────────────────────────────────

export interface VoteState {
  question: string
  options: string[]
  ballots: Record<string, { option: string; reason: string; handle: string; at: string }>
  closed: boolean
}

function tally(vote: VoteState) {
  const counts = Object.fromEntries(vote.options.map((o) => [o, 0])) as Record<string, number>
  for (const ballot of Object.values(vote.ballots)) counts[ballot.option] = (counts[ballot.option] ?? 0) + 1
  const max = Math.max(0, ...Object.values(counts))
  const leaders = max > 0 ? Object.keys(counts).filter((o) => counts[o] === max) : []
  return { counts, leading: leaders.length === 1 ? leaders[0] : null, tied: leaders.length > 1 ? leaders : [] }
}

export async function startVote(
  agent: CollabAgent,
  args: { roomId: string; question: string; options: string[]; wake?: boolean },
) {
  const options = [...new Set(args.options.map((o) => o.trim()).filter(Boolean))].slice(0, 8)
  if (options.length < 2) throw new CollabError("a vote needs at least two options")
  const vote: VoteState = { question: args.question.slice(0, 300), options, ballots: {}, closed: false }
  const list = options.map((o, i) => `${i + 1}. ${o}`).join("\n")
  const result = await postAgentMessage(agent, {
    roomId: args.roomId,
    content: `${args.wake === false ? "" : "@all_bots "}**Vote:** ${vote.question}\n\n${list}\n\nCast your vote with \`cast_vote\`.`,
    metadata: { vote },
  })
  return { vote_id: result.message_id, options, woke: result.woke }
}

export async function castVote(
  agent: CollabAgent,
  args: { voteId: string; option: string; reason?: string },
) {
  if (!/^[0-9a-f-]{36}$/i.test(args.voteId)) throw new CollabError("vote not found")
  const [row] = await getDb()
    .select({ id: messages.id, roomId: messages.roomId, metadata: messages.metadata })
    .from(messages)
    .where(eq(messages.id, args.voteId))
    .limit(1)
  const vote = row?.metadata?.vote as VoteState | undefined
  if (!row || !vote) throw new CollabError("vote not found")
  await assertAgentRoom(agent, row.roomId)
  if (vote.closed) throw new CollabError("this vote is closed")
  const wanted = args.option.trim().toLowerCase()
  const byIndex = /^\d+$/.test(wanted) ? vote.options[Number(wanted) - 1] : undefined
  const option = byIndex ?? vote.options.find((o) => o.toLowerCase() === wanted)
  if (!option) throw new CollabError(`unknown option; choose one of: ${vote.options.join(" | ")}`)
  const ballot = {
    option,
    reason: (args.reason ?? "").slice(0, 500),
    handle: agent.handle,
    at: new Date().toISOString(),
  }
  // jsonb_set keeps concurrent ballots from different agents from overwriting each other.
  const [updated] = await getDb()
    .update(messages)
    .set({
      metadata: sql`jsonb_set(${messages.metadata}, array['vote','ballots',${agent.agentId}]::text[], ${JSON.stringify(ballot)}::jsonb, true)`,
      updatedAt: new Date(),
    })
    .where(eq(messages.id, row.id))
    .returning({ metadata: messages.metadata })
  await broadcast(row.roomId, { type: "message.done", messageId: row.id, status: "complete" })
  const state = (updated?.metadata?.vote as VoteState | undefined) ?? vote
  return { vote_id: row.id, your_vote: option, ...tally(state), voters: Object.keys(state.ballots).length }
}

export async function getVote(agent: CollabAgent, args: { voteId: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(args.voteId)) throw new CollabError("vote not found")
  const [row] = await getDb()
    .select({ roomId: messages.roomId, metadata: messages.metadata })
    .from(messages)
    .where(eq(messages.id, args.voteId))
    .limit(1)
  const vote = row?.metadata?.vote as VoteState | undefined
  if (!row || !vote) throw new CollabError("vote not found")
  await assertAgentRoom(agent, row.roomId)
  return {
    question: vote.question,
    options: vote.options,
    ballots: Object.values(vote.ballots).map((b) => ({ by: `@${b.handle}`, option: b.option, reason: b.reason })),
    ...tally(vote),
  }
}
