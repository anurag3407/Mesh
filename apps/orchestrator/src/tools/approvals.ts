import { toolCalls } from "@mesh/db"
import { eq } from "drizzle-orm"
import type { PoolClient } from "pg"
import { getDb, getPool } from "../db"

const CHANNEL = "tool_call_resolved"
const APPROVAL_TIMEOUT_MS = 5 * 60_000
const POLL_MS = 2_000

type ApprovalStatus = "approved" | "rejected"
type Resolver = (status: ApprovalStatus) => void

const waiters = new Map<string, Resolver>()
let listener: PoolClient | null = null

export async function startApprovalListener(): Promise<void> {
  if (listener) return
  const client = await getPool().connect()
  listener = client
  client.on("notification", (msg) => {
    if (msg.channel !== CHANNEL || !msg.payload) return
    try {
      const payload = JSON.parse(msg.payload) as { toolCallId?: string; status?: ApprovalStatus }
      if (payload.toolCallId && (payload.status === "approved" || payload.status === "rejected")) {
        resolveApprovalWaiter(payload.toolCallId, payload.status)
      }
    } catch {
      // malformed notifications are ignored
    }
  })
  client.on("error", (error) => {
    console.error("[approvals] listener connection error", error)
    client.release()
    listener = null
  })
  await client.query(`LISTEN ${CHANNEL}`)
  console.log("[approvals] listening for tool decisions")
}

export function resolveApprovalWaiter(toolCallId: string, status: ApprovalStatus): void {
  const resolver = waiters.get(toolCallId)
  if (!resolver) return
  waiters.delete(toolCallId)
  resolver(status)
}

async function readResolvedStatus(toolCallId: string): Promise<ApprovalStatus | null> {
  const [row] = await getDb()
    .select({ status: toolCalls.status })
    .from(toolCalls)
    .where(eq(toolCalls.id, toolCallId))
    .limit(1)
  if (row?.status === "approved" || row?.status === "rejected") return row.status
  return null
}

/**
 * Waits for a human decision. LISTEN/NOTIFY is the fast path; a slow poll covers
 * a dropped listener connection. A timeout counts as a rejection.
 */
export async function waitForApproval(
  toolCallId: string,
  timeoutMs = APPROVAL_TIMEOUT_MS,
): Promise<ApprovalStatus> {
  const immediate = await readResolvedStatus(toolCallId)
  if (immediate) return immediate
  return new Promise<ApprovalStatus>((resolve) => {
    let settled = false
    const handles: {
      timer?: ReturnType<typeof setTimeout>
      poll?: ReturnType<typeof setInterval>
    } = {}
    const finish = (status: ApprovalStatus) => {
      if (settled) return
      settled = true
      if (handles.timer) clearTimeout(handles.timer)
      if (handles.poll) clearInterval(handles.poll)
      waiters.delete(toolCallId)
      resolve(status)
    }
    waiters.set(toolCallId, finish)
    handles.timer = setTimeout(() => finish("rejected"), timeoutMs)
    handles.poll = setInterval(() => {
      void readResolvedStatus(toolCallId)
        .then((status) => {
          if (status) finish(status)
        })
        .catch(() => {})
    }, POLL_MS)
    handles.poll.unref?.()
  })
}
