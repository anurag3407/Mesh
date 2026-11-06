import { redactSecrets } from "@mesh/core"
import type { Context } from "hono"
import { Hono } from "hono"
import { z } from "zod"
import { authenticateAgentKey, type BotIdentity } from "../bot/auth"
import {
  agentRooms,
  castVote,
  claimTask,
  CollabError,
  createTask,
  getInbox,
  getRequestStatus,
  getRoomMessages,
  getVote,
  listTasks,
  postAgentMessage,
  requestHumanDecision,
  sendBotDirectMessage,
  startVote,
  updateTask,
  type CollabAgent,
} from "../collab"

/**
 * Mesh as an MCP server. Any MCP client — Claude Desktop/Code, ChatGPT connectors,
 * Cursor, Gemini — connects with an agent API key and becomes a room member that
 * uses its owner's own subscription. Transport is Streamable HTTP with plain JSON
 * responses (no server-initiated stream), which every current client supports.
 */

const SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]
const SERVER_INFO = { name: "mesh", title: "Mesh rooms", version: "1.0.0" }

const INSTRUCTIONS = [
  "You are connected to Mesh, a shared workspace where humans and several AI agents work together in rooms.",
  "Start every session with get_inbox: it returns new messages that mention you, tasks you can claim, and answers to questions you asked the humans.",
  "Read a room with get_room_messages before posting. Post with post_message; mention a teammate with @handle to wake them.",
  "Use the task board: claim_task before starting work so two agents never do the same job, update_task to report progress, and status \"stuck\" to ask teammates for help.",
  "Never take high-stakes actions (spending money, deleting data, sending things outside the team) on your own: call request_human_decision with clear options and wait for the answer.",
  "For choices between approaches, start_vote and let the other agents cast_vote.",
].join("\n")

const uuid = z.string().uuid()
const taskStatus = z.enum(["open", "in_progress", "stuck", "done"])

interface McpTool<S extends z.ZodType = z.ZodType> {
  name: string
  title: string
  description: string
  schema: S
  readOnly?: boolean
  run: (agent: CollabAgent, input: z.infer<S>) => Promise<unknown>
}

function defineTool<S extends z.ZodType>(t: McpTool<S>): McpTool {
  return t as unknown as McpTool
}

export const MCP_TOOLS: McpTool[] = [
  defineTool({
    name: "whoami",
    title: "Who am I",
    description: "Your Mesh identity and the rooms you belong to.",
    schema: z.object({}),
    readOnly: true,
    run: async (agent) => ({ handle: `@${agent.handle}`, rooms: await agentRooms(agent) }),
  }),
  defineTool({
    name: "get_inbox",
    title: "Get inbox",
    description:
      "Everything new for you since you last checked: messages that mention you or @all_bots, direct messages from other bots, open tasks you can claim or already hold, and answers to your human requests. Call this first, and again whenever you finish a piece of work.",
    schema: z.object({
      mark_as_read: z.boolean().optional().describe("Default true. Set false to peek without advancing your read cursor."),
    }),
    readOnly: true,
    run: (agent, input) => getInbox(agent, { markAsRead: input.mark_as_read }),
  }),
  defineTool({
    name: "list_rooms",
    title: "List rooms",
    description: "Rooms you are a member of, with their directive.",
    schema: z.object({}),
    readOnly: true,
    run: (agent) => agentRooms(agent),
  }),
  defineTool({
    name: "get_room_messages",
    title: "Read room messages",
    description: "Recent messages in a room (or one thread), oldest first. Marks the room as read for you.",
    schema: z.object({
      room_id: uuid,
      thread_id: uuid.optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    readOnly: true,
    run: (agent, input) =>
      getRoomMessages(agent, { roomId: input.room_id, threadId: input.thread_id, limit: input.limit }),
  }),
  defineTool({
    name: "post_message",
    title: "Post message",
    description:
      "Post a message to a room as yourself. Markdown is rendered. Mentioning another agent with @handle wakes it to reply. Use thread_id to reply inside a thread.",
    schema: z.object({
      room_id: uuid,
      content: z.string().min(1).max(32_000),
      thread_id: uuid.optional(),
    }),
    run: (agent, input) =>
      postAgentMessage(agent, { roomId: input.room_id, content: input.content, threadRootId: input.thread_id }),
  }),
  defineTool({
    name: "send_direct_message",
    title: "Message another bot",
    description:
      "Send a direct message to one teammate bot to coordinate. It wakes that bot. The humans who own the room can read every bot-to-bot message.",
    schema: z.object({
      room_id: uuid,
      to: z.string().min(1).describe("Handle of the bot, e.g. @gemini"),
      content: z.string().min(1).max(16_000),
    }),
    run: (agent, input) =>
      sendBotDirectMessage(agent, { roomId: input.room_id, toHandle: input.to, content: input.content }),
  }),
  defineTool({
    name: "list_tasks",
    title: "List tasks",
    description: "The room's task board. Check it before creating a task so you do not duplicate one.",
    schema: z.object({ room_id: uuid, status: taskStatus.optional(), mine: z.boolean().optional() }),
    readOnly: true,
    run: (agent, input) => listTasks(agent, { roomId: input.room_id, status: input.status, mine: input.mine }),
  }),
  defineTool({
    name: "create_task",
    title: "Create task",
    description:
      "Add a task to the room's board. By default you take it yourself; set assign_to_me false to leave it for a teammate to claim. Split big goals into several tasks.",
    schema: z.object({
      room_id: uuid,
      title: z.string().min(2).max(120),
      description: z.string().max(4_000).optional(),
      assign_to_me: z.boolean().optional(),
    }),
    run: (agent, input) =>
      createTask(agent, {
        roomId: input.room_id,
        title: input.title,
        description: input.description,
        assignToMe: input.assign_to_me,
      }),
  }),
  defineTool({
    name: "claim_task",
    title: "Claim task",
    description: "Atomically claim an unassigned task. If another agent already holds it you are told who, and nothing changes.",
    schema: z.object({ task_id: uuid }),
    run: (agent, input) => claimTask(agent, { taskId: input.task_id }),
  }),
  defineTool({
    name: "update_task",
    title: "Update task",
    description:
      "Report progress on a task you hold: change status, add a progress note, or release it. Setting status \"stuck\" posts a help request that wakes ask_help_from (or every other bot) and alerts the humans.",
    schema: z.object({
      task_id: uuid,
      status: taskStatus.optional(),
      note: z.string().max(4_000).optional(),
      ask_help_from: z.string().optional().describe("Handle of the teammate best placed to unstick you"),
      release: z.boolean().optional().describe("Give the task back to the board"),
    }),
    run: (agent, input) =>
      updateTask(agent, {
        taskId: input.task_id,
        status: input.status,
        note: input.note,
        askHelpFrom: input.ask_help_from,
        release: input.release,
      }),
  }),
  defineTool({
    name: "request_human_decision",
    title: "Ask the humans",
    description:
      "Check with the humans first. Sends an approval card to their Inbox (and a push alert) for high-stakes decisions, spending, anything irreversible, or missing information. Give 2–6 short options (e.g. [\"Approve\", \"Reject\"]) so they can answer in one tap.",
    schema: z.object({
      room_id: uuid,
      question: z.string().min(4).max(120),
      details: z.string().max(4_000).optional(),
      options: z.array(z.string().min(1).max(60)).max(6).optional(),
    }),
    run: (agent, input) =>
      requestHumanDecision(agent, {
        roomId: input.room_id,
        question: input.question,
        details: input.details,
        options: input.options,
      }),
  }),
  defineTool({
    name: "get_request_status",
    title: "Check a human request",
    description: "Whether the humans have answered one of your requests yet, and what they said.",
    schema: z.object({ request_id: uuid }),
    readOnly: true,
    run: (agent, input) => getRequestStatus(agent, { requestId: input.request_id }),
  }),
  defineTool({
    name: "start_vote",
    title: "Start a vote",
    description: "Ask the other agents to vote between approaches. Wakes every bot in the room unless wake is false.",
    schema: z.object({
      room_id: uuid,
      question: z.string().min(4).max(300),
      options: z.array(z.string().min(1).max(120)).min(2).max(8),
      wake: z.boolean().optional(),
    }),
    run: (agent, input) =>
      startVote(agent, { roomId: input.room_id, question: input.question, options: input.options, wake: input.wake }),
  }),
  defineTool({
    name: "cast_vote",
    title: "Cast a vote",
    description: "Vote on an open vote by option text or 1-based number, with a one-line reason. Voting again replaces your ballot.",
    schema: z.object({ vote_id: uuid, option: z.string().min(1), reason: z.string().max(500).optional() }),
    run: (agent, input) => castVote(agent, { voteId: input.vote_id, option: input.option, reason: input.reason }),
  }),
  defineTool({
    name: "get_vote",
    title: "Vote results",
    description: "Current ballots and the leading option for a vote.",
    schema: z.object({ vote_id: uuid }),
    readOnly: true,
    run: (agent, input) => getVote(agent, { voteId: input.vote_id }),
  }),
]

const toolsByName = new Map(MCP_TOOLS.map((t) => [t.name, t]))

export function listTools() {
  return MCP_TOOLS.map((t) => {
    const { $schema: _ignored, ...inputSchema } = z.toJSONSchema(t.schema, { io: "input" }) as Record<
      string,
      unknown
    >
    return {
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: { type: "object", ...inputSchema },
      annotations: { title: t.title, readOnlyHint: Boolean(t.readOnly), openWorldHint: false },
    }
  })
}

interface JsonRpcMessage {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

type RpcResponse = { jsonrpc: "2.0"; id: string | number | null } & (
  | { result: unknown }
  | { error: { code: number; message: string } }
)

function rpcError(id: JsonRpcMessage["id"], code: number, message: string): RpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } }
}

async function callTool(agent: CollabAgent, params: Record<string, unknown> | undefined) {
  const name = typeof params?.name === "string" ? params.name : ""
  const tool = toolsByName.get(name)
  if (!tool) return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true }
  const parsed = tool.schema.safeParse(params?.arguments ?? {})
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")
    return { content: [{ type: "text", text: `Invalid arguments: ${issues}` }], isError: true }
  }
  try {
    const result = await tool.run(agent, parsed.data)
    const text = redactSecrets(JSON.stringify(result, null, 2) ?? "null").text
    return {
      content: [{ type: "text", text }],
      ...(result && typeof result === "object" && !Array.isArray(result) ? { structuredContent: result } : {}),
    }
  } catch (error) {
    const message =
      error instanceof CollabError
        ? error.message
        : (console.error(`[mcp] tool ${name} failed`, error), "internal error running the tool")
    return { content: [{ type: "text", text: message }], isError: true }
  }
}

async function handle(identity: BotIdentity, msg: JsonRpcMessage): Promise<RpcResponse | null> {
  const isNotification = msg.id === undefined
  if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return isNotification ? null : rpcError(msg.id, -32600, "invalid request")
  }
  if (isNotification) return null
  const agent: CollabAgent = { agentId: identity.agentId, orgId: identity.orgId, handle: identity.agent.handle }
  switch (msg.method) {
    case "initialize": {
      const requested = typeof msg.params?.protocolVersion === "string" ? msg.params.protocolVersion : ""
      return {
        jsonrpc: "2.0",
        id: msg.id ?? null,
        result: {
          protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: `${INSTRUCTIONS}\n\nYou are @${identity.agent.handle} (${identity.agent.displayName}).`,
        },
      }
    }
    case "ping":
      return { jsonrpc: "2.0", id: msg.id ?? null, result: {} }
    case "tools/list":
      return { jsonrpc: "2.0", id: msg.id ?? null, result: { tools: listTools() } }
    case "tools/call":
      return { jsonrpc: "2.0", id: msg.id ?? null, result: await callTool(agent, msg.params) }
    case "resources/list":
      return { jsonrpc: "2.0", id: msg.id ?? null, result: { resources: [] } }
    case "prompts/list":
      return { jsonrpc: "2.0", id: msg.id ?? null, result: { prompts: [] } }
    default:
      return rpcError(msg.id, -32601, `method not found: ${msg.method}`)
  }
}

async function serve(c: Context, token: string | undefined) {
  const identity = await authenticateAgentKey(token ? `Bearer ${token}` : c.req.header("authorization"))
  if (!identity) {
    return c.json(rpcError(null, -32001, "invalid or revoked Mesh agent key"), 401, {
      "www-authenticate": 'Bearer realm="mesh"',
    })
  }
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(rpcError(null, -32700, "parse error"), 400)
  }
  const batch = Array.isArray(body)
  const items = (batch ? body : [body]) as JsonRpcMessage[]
  const responses = (await Promise.all(items.map((m) => handle(identity, m)))).filter(
    (r): r is RpcResponse => r !== null,
  )
  if (responses.length === 0) return c.body(null, 202)
  return c.json(batch ? responses : responses[0])
}

export const mcpRoutes = new Hono()

// The key can travel in the URL for clients whose connector UI only takes a URL
// (ChatGPT, Gemini, Claude.ai). Header auth is preferred where the client allows it.
mcpRoutes.post("/v1/mcp", (c) => serve(c, undefined))
mcpRoutes.post("/v1/mcp/:token", (c) => serve(c, c.req.param("token")))
for (const path of ["/v1/mcp", "/v1/mcp/:token"]) {
  mcpRoutes.get(path, (c) => c.body(null, 405, { allow: "POST" }))
  mcpRoutes.delete(path, (c) => c.body(null, 405, { allow: "POST" }))
}
