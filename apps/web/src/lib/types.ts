export type OrgRole = "owner" | "admin" | "member"
export type RoomRole = "admin" | "member"
export type RoomKind = "public" | "private" | "dm"
export type TurnMode = "mentions" | "debate" | "moderated"
export type SenderType = "human" | "agent" | "system"
export type MessageStatus = "streaming" | "complete" | "error" | "halted"
export type CanvasKind = "markdown" | "code" | "svg" | "html"
export type ToolCallStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "running"
  | "done"
  | "error"

export interface OrgSummary {
  id: string
  slug: string
  name: string
  role: OrgRole
  ssoEnabled: boolean
}

export interface OrgAccess {
  org: { id: string; slug: string; name: string; ssoEnabled: boolean }
  role: OrgRole
  user: { id: string; email: string | null; displayName: string; avatarUrl: string | null }
}

export interface RoomView {
  id: string
  orgId: string
  name: string
  kind: RoomKind
  turnMode: TurnMode
  systemDirective: string | null
  turnCap: number
  rpmLimit: number | null
  dailyBudgetUsd: number | null
  moderatorAgentId: string | null
  debateOrder: string[]
  createdAt: string
}

export interface RoomAccess {
  org: OrgAccess["org"]
  orgRole: OrgRole
  user: OrgAccess["user"]
  room: RoomView
  roomRole: RoomRole | null
  canAdmin: boolean
}

export interface AgentView {
  id: string
  orgId: string
  handle: string
  displayName: string
  kind: "llm" | "external"
  providerKeyId: string | null
  model: string | null
  systemPrompt: string
  params: Record<string, unknown>
  toolIds: string[]
  webhookUrl: string | null
  createdAt: string
}

export interface RoomAgentView {
  agent: AgentView
  position: number
}

export interface MessageView {
  id: string
  roomId: string
  threadRootId: string | null
  senderType: SenderType
  senderId: string | null
  content: string
  status: MessageStatus
  mentions: string[]
  runId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  senderName: string
  senderHandle: string | null
}

export interface ToolCallView {
  id: string
  runId: string | null
  roomId: string
  messageId: string | null
  toolName: string
  args: Record<string, unknown>
  result: unknown
  status: ToolCallStatus
  approvedBy: string | null
  resolvedAt: string | null
  error: string | null
  createdAt: string
}

export interface CanvasView {
  id: string
  roomId: string
  kind: CanvasKind
  title: string
  language: string | null
  snapshotText: string
  updatedAt: string
}

export interface CanvasVersionView {
  id: string
  canvasId: string
  authorType: string
  authorId: string | null
  snapshotText: string
  createdAt: string
}

export interface TurnStateView {
  sessionId: string
  activeAgentId: string | null
  queue: string[]
  threadRootId?: string | null
}

export interface MemberView {
  userId: string
  displayName: string
  avatarUrl: string | null
  role: OrgRole
}

export interface ProviderKeyView {
  id: string
  provider: string
  baseUrl: string | null
  label: string
  last4: string
  createdAt: string
}

export interface McpServerView {
  id: string
  orgId: string
  roomId: string | null
  name: string
  transport: "http" | "sse"
  url: string
  dangerousTools: string[]
  enabled: boolean
  createdAt: string
}

export interface OrgToolConfigView {
  id: string
  orgId: string
  tool: string
  enabled: boolean
  updatedAt: string
}

export interface WebhookDeliveryView {
  id: string
  agentId: string | null
  messageId: string | null
  attempt: number
  statusCode: number | null
  responseMs: number | null
  error: string | null
  createdAt: string
}

export interface AgentApiKeyView {
  id: string
  agentId: string
  prefix: string
  label: string
  scopes: string[]
  revokedAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

export interface AuditLogView {
  id: string
  actorType: string
  actorId: string | null
  action: string
  target: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface PricingView {
  provider: string
  model: string
  inputPerMtok: number
  outputPerMtok: number
  updatedAt: string
}

export interface SessionView {
  id: string
  threadRootId: string | null
  state: string
  queue: { agentId: string; role: string }[]
}

export interface RoomPageData {
  room: RoomView
  roomRole: RoomRole | null
  canAdmin: boolean
  user: OrgAccess["user"]
  org: OrgAccess["org"]
  orgRole: OrgRole
  messages: MessageView[]
  toolCalls: ToolCallView[]
  roomAgents: RoomAgentView[]
  canvases: CanvasView[]
  members: MemberView[]
  activeSession: SessionView | null
  threadCounts: Record<string, number>
}

export interface ActionResult {
  ok: boolean
  error?: string
  message?: string
  warning?: string
  data?: Record<string, unknown>
}
