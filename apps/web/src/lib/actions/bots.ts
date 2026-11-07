"use server"

import { generateAgentApiKey, generateWebhookSecret } from "@sayabot/core/server"
import { sealSecret } from "@sayabot/llm"
import { getKek } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { adminOrgAccess, audit, errorMessage, fail, ok, revalidateOrg } from "@/lib/actions/shared"
import type { ActionResult } from "@/lib/types"

export async function issueAgentApiKey(input: {
  orgSlug: string
  agentId: string
  label: string
}): Promise<ActionResult> {
  const check = await adminOrgAccess(input.orgSlug)
  if ("error" in check) return fail(check.error)
  const admin = createAdminClient()
  const { data: agent } = await admin
    .from("agents")
    .select("id, org_id, kind, handle")
    .eq("id", input.agentId)
    .maybeSingle()
  if (!agent || agent.org_id !== check.access.org.id) return fail("Agent not found")
  if (agent.kind !== "external") return fail("API keys are for external agents")
  const key = generateAgentApiKey()
  const label = input.label.trim().slice(0, 60) || "default"
  const { error } = await admin.from("agent_api_keys").insert({
    agent_id: input.agentId,
    prefix: key.prefix,
    key_hash: key.hash,
    scopes: ["messages:write"],
    label,
  })
  if (error) return fail(errorMessage(error))
  await audit({
    orgId: check.access.org.id,
    actorId: check.access.user.id,
    action: "agent_api_key.issued",
    target: `@${agent.handle}`,
    metadata: { label, last4: key.last4 },
  })
  revalidateOrg(input.orgSlug)
  return ok("API key issued. Copy it now; it is not shown again.", { token: key.token })
}

export async function rotateWebhookSecret(input: {
  orgSlug: string
  agentId: string
}): Promise<ActionResult> {
  const check = await adminOrgAccess(input.orgSlug)
  if ("error" in check) return fail(check.error)
  const admin = createAdminClient()
  const { data: agent } = await admin
    .from("agents")
    .select("id, org_id, kind, handle")
    .eq("id", input.agentId)
    .maybeSingle()
  if (!agent || agent.org_id !== check.access.org.id) return fail("Agent not found")
  if (agent.kind !== "external") return fail("Only external agents use webhook secrets")
  const secret = generateWebhookSecret()
  const { error } = await admin
    .from("agents")
    .update({ webhook_secret_enc: sealSecret(secret, getKek()) })
    .eq("id", input.agentId)
  if (error) return fail(errorMessage(error))
  await audit({
    orgId: check.access.org.id,
    actorId: check.access.user.id,
    action: "agent.webhook_secret_rotated",
    target: `@${agent.handle}`,
  })
  revalidateOrg(input.orgSlug)
  return ok("Webhook secret rotated. Update the bot before it receives its next turn.", {
    secret,
  })
}

export async function revokeAgentApiKey(input: {
  orgSlug: string
  keyId: string
}): Promise<ActionResult> {
  const check = await adminOrgAccess(input.orgSlug)
  if ("error" in check) return fail(check.error)
  const admin = createAdminClient()
  const { data: key } = await admin
    .from("agent_api_keys")
    .select("id, prefix, agent_id")
    .eq("id", input.keyId)
    .maybeSingle()
  if (!key) return fail("Key not found")
  const { data: agent } = await admin
    .from("agents")
    .select("org_id, handle")
    .eq("id", key.agent_id)
    .maybeSingle()
  if (!agent || agent.org_id !== check.access.org.id) return fail("Key not found")
  const { error } = await admin
    .from("agent_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", input.keyId)
  if (error) return fail(errorMessage(error))
  await audit({
    orgId: check.access.org.id,
    actorId: check.access.user.id,
    action: "agent_api_key.revoked",
    target: `@${agent.handle}`,
    metadata: { prefix: key.prefix },
  })
  revalidateOrg(input.orgSlug)
  return ok("Key revoked")
}
