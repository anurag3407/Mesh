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
