"use server"

import { z } from "zod"
import { redactSecrets } from "@mesh/core"
import { generateWebhookSecret } from "@mesh/core/server"
import { sealSecret } from "@mesh/llm"
import { createAdminClient } from "@/lib/supabase/admin"
import { getKek } from "@/lib/env"
import { testAgentInOrchestrator } from "@/lib/orchestrator"
import {
  adminOrgAccess,
  audit,
  errorMessage,
  fail,
  field,
  ok,
  optionalField,
  parseJsonObject,
  revalidateOrg,
} from "@/lib/actions/shared"
import type { ActionResult } from "@/lib/types"

const handleSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{0,38}$/, "Use lowercase letters, numbers and hyphens, starting with a letter")
const RESERVED_HANDLES = new Set(["all_bots", "human", "system", "moderator"])

function validateAgentFields(formData: FormData, kind: "llm" | "external") {
  const handle = field(formData, "handle").toLowerCase()
  const displayName = field(formData, "displayName")
  if (!handleSchema.safeParse(handle).success) {
    return { error: "Handle must be lowercase letters, numbers and hyphens, starting with a letter" }
  }
  if (RESERVED_HANDLES.has(handle)) return { error: "That handle is reserved" }
  if (displayName.length < 1 || displayName.length > 60) {
    return { error: "Display name must be 1 to 60 characters" }
  }
  const paramsResult = parseJsonObject(field(formData, "params"))
  if (!paramsResult.ok) return { error: `Params: ${paramsResult.error}` }
  const toolIds = formData
    .getAll("toolIds")
    .filter((value): value is string => typeof value === "string")
  const providerKeyId = optionalField(formData, "providerKeyId")
  const model = optionalField(formData, "model")
  const webhookUrl = optionalField(formData, "webhookUrl")
  if (kind === "llm" && providerKeyId && !model) {
    return { error: "A model id is required when a provider key is attached" }
  }
  // External agents without a webhook connect over MCP from their owner's own client.
  if (kind === "external" && webhookUrl && !/^https?:\/\//.test(webhookUrl)) {
    return { error: "Webhook URL must start with http(s)://" }
  }
  return {
    handle,
    displayName,
    params: paramsResult.value,
    toolIds,
    providerKeyId,
    model,
    webhookUrl,
  }
}

export async function createAgent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const orgSlug = field(formData, "orgSlug")
  const check = await adminOrgAccess(orgSlug)
  if ("error" in check) return fail(check.error)
  const kindParsed = z.enum(["llm", "external"]).safeParse(field(formData, "kind") || "llm")
  if (!kindParsed.success) return fail("Choose an agent kind")
  const kind = kindParsed.data
  const fields = validateAgentFields(formData, kind)
  if ("error" in fields) return fail(fields.error ?? "Invalid agent fields")
  const admin = createAdminClient()
  if (fields.providerKeyId) {
    const { data: key } = await admin
      .from("provider_keys")
      .select("id, org_id")
      .eq("id", fields.providerKeyId)
      .maybeSingle()
    if (!key || key.org_id !== check.access.org.id) return fail("Provider key not found")
  }
  const webhookSecret = kind === "external" && fields.webhookUrl ? generateWebhookSecret() : null
  const { data: agent, error } = await admin
    .from("agents")
    .insert({
      org_id: check.access.org.id,
      handle: fields.handle,
      display_name: fields.displayName,
      kind,
      provider_key_id: fields.providerKeyId,
      model: fields.model,
      system_prompt: field(formData, "systemPrompt"),
      params: fields.params,
      tool_ids: fields.toolIds,
      webhook_url: fields.webhookUrl,
      webhook_secret_enc: webhookSecret ? sealSecret(webhookSecret, getKek()) : null,
    })
    .select("id")
    .single()
  if (error || !agent) {
    return fail(
      error?.code === "23505" ? `@${fields.handle} already exists` : errorMessage(error),
    )
  }
  const roomId = optionalField(formData, "roomId")
  let addedToRoom = false
  if (roomId) {
    const { data: room } = await admin
      .from("rooms")
      .select("id, org_id, kind")
      .eq("id", roomId)
      .maybeSingle()
    if (room && room.org_id === check.access.org.id && room.kind !== "dm") {
      const { data: last } = await admin
        .from("room_agents")
        .select("position")
        .eq("room_id", roomId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle()
      const { error: linkError } = await admin
        .from("room_agents")
        .insert({ room_id: roomId, agent_id: agent.id, position: (last?.position ?? -1) + 1 })
      addedToRoom = !linkError
    }
  }
  await audit({
    orgId: check.access.org.id,
    actorId: check.access.user.id,
    action: "agent.created",
    target: fields.handle,
    metadata: { kind, model: fields.model },
  })
  revalidateOrg(orgSlug)
  return ok(
    webhookSecret
      ? "Agent created. Copy the webhook secret now."
      : addedToRoom
        ? "Agent created and added to the room"
        : "Agent created",
    { agentId: agent.id, kind, webhookSecret },
  )
}

export async function updateAgent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const orgSlug = field(formData, "orgSlug")
  const agentId = field(formData, "agentId")
  const check = await adminOrgAccess(orgSlug)
  if ("error" in check) return fail(check.error)
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("agents")
    .select("id, org_id, kind")
    .eq("id", agentId)
    .maybeSingle()
  if (!existing || existing.org_id !== check.access.org.id) return fail("Agent not found")
  const fields = validateAgentFields(formData, existing.kind)
  if ("error" in fields) return fail(fields.error ?? "Invalid agent fields")
  if (fields.providerKeyId) {
    const { data: key } = await admin
      .from("provider_keys")
      .select("id, org_id")
      .eq("id", fields.providerKeyId)
      .maybeSingle()
    if (!key || key.org_id !== check.access.org.id) return fail("Provider key not found")
  }
  const { error } = await admin
    .from("agents")
    .update({
      handle: fields.handle,
      display_name: fields.displayName,
      provider_key_id: fields.providerKeyId,
      model: fields.model,
      system_prompt: field(formData, "systemPrompt"),
      params: fields.params,
      tool_ids: fields.toolIds,
      webhook_url: fields.webhookUrl,
    })
    .eq("id", agentId)
  if (error) {
    return fail(error.code === "23505" ? `@${fields.handle} already exists` : errorMessage(error))
  }
  await audit({
    orgId: check.access.org.id,
    actorId: check.access.user.id,
    action: "agent.updated",
    target: fields.handle,
  })
  revalidateOrg(orgSlug)
  return ok("Agent saved")
}

export async function deleteAgentAction(input: {
  orgSlug: string
  agentId: string
}): Promise<ActionResult> {
  const check = await adminOrgAccess(input.orgSlug)
  if ("error" in check) return fail(check.error)
  const admin = createAdminClient()
  const orgId = check.access.org.id
  const { data: agent } = await admin
    .from("agents")
    .select("id, org_id, handle")
    .eq("id", input.agentId)
    .maybeSingle()
  if (!agent || agent.org_id !== orgId) return fail("Agent not found")
  // A direct chat with a deleted agent could never get another reply.
  await admin.from("rooms").delete().eq("org_id", orgId).eq("agent_dm_agent_id", input.agentId)
  const { data: debateRooms } = await admin
    .from("rooms")
    .select("id, debate_order")
    .eq("org_id", orgId)
    .contains("debate_order", [input.agentId])
  for (const room of debateRooms ?? []) {
    await admin
      .from("rooms")
      .update({
        debate_order: (room.debate_order as string[]).filter((id) => id !== input.agentId),
      })
      .eq("id", room.id)
  }
  const { error } = await admin.from("agents").delete().eq("id", input.agentId)
  if (error) return fail(errorMessage(error))
  await audit({
    orgId,
    actorId: check.access.user.id,
    action: "agent.deleted",
    target: agent.handle,
  })
  revalidateOrg(input.orgSlug)
  return ok("Agent deleted")
}

export async function testAgent(orgSlug: string, agentId: string): Promise<ActionResult> {
  const check = await adminOrgAccess(orgSlug)
  if ("error" in check) return fail(check.error)
  const admin = createAdminClient()
  const { data: agent } = await admin
    .from("agents")
    .select("id, org_id, handle, kind")
    .eq("id", agentId)
    .maybeSingle()
  if (!agent || agent.org_id !== check.access.org.id) return fail("Agent not found")
  if (agent.kind === "external") {
    return fail("External agents are checked in their webhook delivery log")
  }
  const result = await testAgentInOrchestrator(agentId, check.access.org.id)
  if (!result.ok) {
    return fail(`Agent test failed: ${redactSecrets(result.error).text}`)
  }
  return ok(`@${agent.handle} replied in ${result.latencyMs} ms via ${result.model}`, {
    reply: redactSecrets(result.text).text,
  })
}
