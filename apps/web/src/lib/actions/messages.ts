"use server"

import { getRoomAccess } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { insertHumanMessage } from "@/lib/message-send"
import { queueRoomMessage, stopRunInOrchestrator } from "@/lib/orchestrator"
import { audit, fail, ok } from "@/lib/actions/shared"
import type { ActionResult } from "@/lib/types"

export async function sendMessage(input: {
  orgSlug: string
  roomId: string
  content: string
  threadRootId?: string | null
  clientId?: string | null
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail("Your session expired. Sign in again.")
  const access = await getRoomAccess(input.orgSlug, input.roomId)
  if (!access) return fail("Room not found")
  const inserted = await insertHumanMessage({
    supabase,
    userId: user.id,
    roomId: input.roomId,
    content: input.content,
    threadRootId: input.threadRootId ?? null,
    clientId: input.clientId ?? null,
  })
  if (!inserted.ok) return fail(inserted.error)
  const queued = await queueRoomMessage(input.roomId, inserted.id)
  return {
    ok: true,
    data: { messageId: inserted.id },
    warning: queued.ok ? undefined : "Message saved, but the agent queue is unreachable.",
  }
}

export async function stopGeneration(input: {
  orgSlug: string
  roomId: string
  runId: string
}): Promise<ActionResult> {
  const access = await getRoomAccess(input.orgSlug, input.roomId)
  if (!access) return fail("Room not found")
  const supabase = await createSupabaseServerClient()
  const { data: run } = await supabase
    .from("agent_runs")
    .select("id")
    .eq("id", input.runId)
    .eq("room_id", input.roomId)
    .maybeSingle()
  if (!run) return fail("Run not found in this room")
  const result = await stopRunInOrchestrator(input.runId)
  if (!result.ok) {
    return fail("The orchestrator could not be reached to stop this run.")
  }
  return ok("Stopping")
}

export async function resolveToolCall(input: {
  orgSlug: string
  toolCallId: string
  decision: "approved" | "rejected"
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail("Your session expired. Sign in again.")
  const { data: toolCall } = await supabase
    .from("tool_calls")
    .select("id, room_id, status, tool_name")
    .eq("id", input.toolCallId)
    .maybeSingle()
  if (!toolCall) return fail("Tool call not found")
  const access = await getRoomAccess(input.orgSlug, toolCall.room_id)
  if (!access) return fail("Room not found")
  if (!access.canAdmin) return fail("Only room admins can approve tool calls")
  if (toolCall.status !== "pending_approval") return fail("This tool call is no longer pending")
  const admin = createAdminClient()
  const { error } = await admin
    .from("tool_calls")
    .update({
      status: input.decision,
      approved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", input.toolCallId)
    .eq("status", "pending_approval")
  if (error) return fail(error.message)
  await admin.rpc("notify_tool_resolution", {
    p_tool_call: input.toolCallId,
    p_status: input.decision,
  })
  await audit({
    orgId: access.org.id,
    actorId: user.id,
    action: `tool.${input.decision}`,
    target: input.toolCallId,
    metadata: { tool: toolCall.tool_name, roomId: toolCall.room_id },
  })
  return ok(input.decision === "approved" ? "Tool approved" : "Tool rejected")
}
