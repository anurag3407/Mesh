import { pgEnum } from "drizzle-orm/pg-core"

export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"])
export const roomMemberRoleEnum = pgEnum("room_member_role", ["admin", "member"])
export const roomKindEnum = pgEnum("room_kind", ["public", "private", "dm"])
export const turnModeEnum = pgEnum("turn_mode", ["mentions", "debate", "moderated"])
export const agentKindEnum = pgEnum("agent_kind", ["llm", "external"])
export const providerEnum = pgEnum("provider", [
  "openai",
  "anthropic",
  "google",
  "groq",
  "cerebras",
  "openai-compatible",
])
export const senderTypeEnum = pgEnum("sender_type", ["human", "agent", "system"])
export const messageStatusEnum = pgEnum("message_status", [
  "streaming",
  "complete",
  "error",
  "halted",
])
export const turnSessionStateEnum = pgEnum("turn_session_state", [
  "active",
  "complete",
  "halted",
  "superseded",
])
export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "running",
  "complete",
  "error",
  "halted",
])
export const turnRoleEnum = pgEnum("turn_role", [
  "responder",
  "producer",
  "critic",
  "summarizer",
  "moderator",
])
export const canvasKindEnum = pgEnum("canvas_kind", ["markdown", "code", "svg", "html"])
export const mcpTransportEnum = pgEnum("mcp_transport", ["http", "sse"])
export const toolCallStatusEnum = pgEnum("tool_call_status", [
  "pending_approval",
  "approved",
  "rejected",
  "running",
  "done",
  "error",
])
export const builtinToolEnum = pgEnum("builtin_tool", [
  "web_search",
  "github_bridge",
  "postgres_inspector",
])
