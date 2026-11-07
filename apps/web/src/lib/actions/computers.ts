"use server"

import {
  adminOrgAccess,
  audit,
  errorMessage,
  fail,
  field,
  ok,
  revalidateOrg,
} from "@/lib/actions/shared"
import { getComputerdUrl } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import type { ActionResult } from "@/lib/types"

export async function stopComputerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const orgSlug = field(formData, "orgSlug")
  const check = await adminOrgAccess(orgSlug)
  if ("error" in check) return fail(check.error)

  const agentId = field(formData, "agentId")
  if (!agentId) return fail("Agent ID is required")

  // Stop the actual container via computerd
  try {
    const computerdUrl = getComputerdUrl()
    const secret = process.env.ORCHESTRATOR_INTERNAL_SECRET || ""
    await fetch(`${computerdUrl}/v1/computers/${agentId}/stop`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": secret,
      },
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error(`[stopComputerAction] failed to call computerd stop for ${agentId}:`, err)
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("agent_computers")
    .update({ status: "stopped" })
    .eq("agent_id", agentId)
    .eq("org_id", check.access.org.id)

  if (error) return fail(errorMessage(error))

  await audit({
    orgId: check.access.org.id,
    actorId: check.access.user.id,
    action: "computer.stopped",
    target: agentId,
  })

  revalidateOrg(orgSlug)
  return ok("Computer stopped")
}

export async function startComputerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const orgSlug = field(formData, "orgSlug")
  const check = await adminOrgAccess(orgSlug)
  if ("error" in check) return fail(check.error)

  const agentId = field(formData, "agentId")
  if (!agentId) return fail("Agent ID is required")

  // Ensure container starts via computerd
  try {
    const computerdUrl = getComputerdUrl()
    const secret = process.env.ORCHESTRATOR_INTERNAL_SECRET || ""
    await fetch(`${computerdUrl}/v1/computers/${agentId}/ensure`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ orgId: check.access.org.id }),
      signal: AbortSignal.timeout(10000),
    })
  } catch (err) {
    console.error(`[startComputerAction] failed to call computerd ensure for ${agentId}:`, err)
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("agent_computers")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("agent_id", agentId)
    .eq("org_id", check.access.org.id)

  if (error) return fail(errorMessage(error))

  await audit({
    orgId: check.access.org.id,
    actorId: check.access.user.id,
    action: "computer.started",
    target: agentId,
  })

  revalidateOrg(orgSlug)
  return ok("Computer started")
}
