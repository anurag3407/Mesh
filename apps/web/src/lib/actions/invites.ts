"use server"

import {
  getClientConfigSnippet,
  normalizeClient,
} from "@sayabot/core"
import {
  generateAgentApiKey,
} from "@sayabot/core/server"
import { randomBytes } from "node:crypto"
import {
  adminRoomAccess,
  audit,
  errorMessage,
  fail,
  field,
  ok,
  revalidateOrg,
} from "@/lib/actions/shared"
import { getAppUrl } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import type { ActionResult } from "@/lib/types"

export async function createRoomBotKey(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const orgSlug = field(formData, "orgSlug")
  const roomId = field(formData, "roomId")
  const client = normalizeClient(field(formData, "client") || "claude-code")
  const rawHandle = field(formData, "handle").toLowerCase().trim()

  const check = await adminRoomAccess(orgSlug, roomId)
  if ("error" in check) return fail(check.error)

  const admin = createAdminClient()

  // 1. Generate unique handle if not provided
  let handle = rawHandle
  if (!handle) {
    const base = client.id.replace(/[^a-z0-9]/g, "")
    handle = `${base}-${Date.now().toString(36).slice(-4)}`
  }

  // 2. Create external agent
  const displayName = `${client.label} Bot`
  const { data: agent, error: agentError } = await admin
    .from("agents")
    .insert({
      org_id: check.access.org.id,
      handle,
      display_name: displayName,
      kind: "external",
      visibility: "team",
      room_ids: [roomId],
    })
    .select()
    .single()

  if (agentError || !agent) {
    return fail(errorMessage(agentError) || "Failed to register external bot")
  }

  // 3. Link agent to room
  await admin.from("room_agents").insert({
    room_id: roomId,
    agent_id: agent.id,
  })

  // 4. Issue room-scoped agent key
  const generated = generateAgentApiKey()
  const rawApiKey = generated.token
  const keyHash = generated.hash
  const keyPrefix = generated.prefix

  const { error: keyError } = await admin.from("agent_api_keys").insert({
    agent_id: agent.id,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    room_ids: [roomId],
    scopes: ["room:read", "room:write", "tasks:read", "tasks:write", "canvas:read", "canvas:write", "secrets:use"],
    label: `${client.label} connection key for #${check.access.room.name}`,
  })

  if (keyError) {
    return fail(errorMessage(keyError) || "Failed to create agent API key")
  }

  const appUrl = getAppUrl().replace(/\/+$/, "")
  const connectionUrl = `${appUrl}/mcp/${rawApiKey}`
  const snippet = getClientConfigSnippet(client.id, connectionUrl, "sayabot")

  await audit({
    orgId: check.access.org.id,
    actorId: check.access.user.id,
    action: "invite.bot_key_created",
    target: agent.id,
    metadata: { client: client.id, roomId, handle: agent.handle },
  })

  revalidateOrg(orgSlug)
  return ok("Bot invitation created", {
    apiKey: rawApiKey,
    connectionUrl,
    snippet,
    handle: agent.handle,
    client: client.id,
  })
}

export async function createRoomInvite(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const orgSlug = field(formData, "orgSlug")
  const roomId = field(formData, "roomId")
  const client = normalizeClient(field(formData, "client") || "claude-code")

  const check = await adminRoomAccess(orgSlug, roomId)
  if ("error" in check) return fail(check.error)

  const admin = createAdminClient()
  const code = `sinv_${randomBytes(16).toString("hex")}`
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: invite, error } = await admin
    .from("room_invites")
    .insert({
      org_id: check.access.org.id,
      room_id: roomId,
      created_by: check.access.user.id,
      code,
      client: client.id,
      expires_at: expiresAt,
    })
    .select("code, expires_at")
    .single()

  if (error || !invite) {
    return fail(errorMessage(error) || "Failed to create invite")
  }

  const appUrl = getAppUrl().replace(/\/+$/, "")
  const inviteUrl = `${appUrl}/mcp/r/${invite.code}`
  const snippet = getClientConfigSnippet(client.id, inviteUrl, "sayabot")

  return ok("Invite code generated", {
    code: invite.code,
    inviteUrl,
    snippet,
    expiresAt: invite.expires_at,
  })
}
