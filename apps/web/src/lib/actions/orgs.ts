"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { z } from "zod"
import { requireUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  adminOrgAccess,
  audit,
  errorMessage,
  fail,
  field,
  ok,
  revalidateOrg,
  slugify,
} from "@/lib/actions/shared"
import { ssoEnabled } from "@/lib/env"
import type { ActionResult } from "@/lib/types"

const orgRoleSchema = z.enum(["owner", "admin", "member"])

async function uniqueSlug(base: string): Promise<string> {
  const admin = createAdminClient()
  const root = slugify(base) || "workspace"
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`
    const { data } = await admin.from("orgs").select("id").eq("slug", candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${root}-${Date.now().toString(36)}`
}

export async function createOrg(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser("/onboarding")
  const name = field(formData, "name")
  if (name.length < 2 || name.length > 60) return fail("Name must be 2 to 60 characters")
  const requestedSlug = field(formData, "slug")
  if (requestedSlug && !/^[a-z0-9][a-z0-9-]{1,47}$/.test(requestedSlug)) {
    return fail("Slug can use lowercase letters, numbers and hyphens")
  }
  const slug = await uniqueSlug(requestedSlug || name)
  const admin = createAdminClient()
  const { data: org, error } = await admin
    .from("orgs")
    .insert({ name, slug })
    .select("id")
    .single()
  if (error || !org) return fail(errorMessage(error) || "Could not create the organization")
  const { error: memberError } = await admin
    .from("org_members")
    .insert({ org_id: org.id, user_id: user.id, role: "owner" })
  if (memberError) {
    await admin.from("orgs").delete().eq("id", org.id)
    return fail("Could not add you as the organization owner")
  }
  await audit({
    orgId: org.id,
    actorId: user.id,
    action: "org.created",
    target: slug,
    metadata: { name },
  })
  redirect(`/${slug}`)
}

async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const admin = createAdminClient()
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return { id: found.id }
    if (data.users.length < 200) return null
  }
  return null
}

export async function inviteMember(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const orgSlug = field(formData, "orgSlug")
  const check = await adminOrgAccess(orgSlug)
  if ("error" in check) return fail(check.error)
  const admin = createAdminClient()
  const email = field(formData, "email").toLowerCase()
  const roleParsed = orgRoleSchema.safeParse(field(formData, "role") || "member")
  if (!z.string().email().safeParse(email).success) return fail("Enter a valid email")
  if (!roleParsed.success) return fail("Choose a valid role")
  const role = roleParsed.data
  if (role === "owner" && check.access.role !== "owner") {
    return fail("Only an owner can add another owner")
  }

  const existing = await findUserByEmail(email)
  let userId = existing?.id
  if (!userId) {
    const headerList = await headers()
    const origin = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      headerList.get("origin") ||
      `http://${headerList.get("host") ?? "localhost:3000"}`
    ).replace(/\/+$/, "")
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/${orgSlug}`,
    })
    if (error || !data.user) {
      return fail(error?.message ?? "Could not invite that address")
    }
    userId = data.user.id
  }

  const { data: already } = await admin
    .from("org_members")
    .select("user_id")
    .eq("org_id", check.access.org.id)
    .eq("user_id", userId)
    .maybeSingle()
  if (already) return fail("That person is already a member")

  const { error } = await admin
    .from("org_members")
    .insert({ org_id: check.access.org.id, user_id: userId, role })
  if (error) return fail(errorMessage(error))
  await audit({
    orgId: check.access.org.id,
    actorId: check.access.user.id,
    action: "member.invited",
    target: email,
    metadata: { role },
  })
  revalidateOrg(orgSlug)
  return ok(existing ? "Member added" : "Invitation sent")
}

export async function setMemberRole(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const orgSlug = field(formData, "orgSlug")
  const check = await adminOrgAccess(orgSlug)
  if ("error" in check) return fail(check.error)
  const userId = field(formData, "userId")
  const roleParsed = orgRoleSchema.safeParse(field(formData, "role"))
  if (!userId || !roleParsed.success) return fail("Invalid member or role")
  const role = roleParsed.data
  if (role === "owner" && check.access.role !== "owner") {
    return fail("Only an owner can promote someone to owner")
  }
  const admin = createAdminClient()
  const { data: members } = await admin
    .from("org_members")
    .select("user_id, role")
    .eq("org_id", check.access.org.id)
  const target = members?.find((m) => m.user_id === userId)
  if (!target) return fail("Member not found")
  if (target.role === "owner" && check.access.role !== "owner") {
    return fail("Only an owner can change another owner")
  }
  const ownerCount = members?.filter((m) => m.role === "owner").length ?? 0
  if (target.role === "owner" && role !== "owner" && ownerCount <= 1) {
    return fail("An organization needs at least one owner")
  }
  const { error } = await admin
    .from("org_members")
    .update({ role })
    .eq("org_id", check.access.org.id)
    .eq("user_id", userId)
  if (error) return fail(errorMessage(error))
  await audit({
    orgId: check.access.org.id,
    actorId: check.access.user.id,
    action: "member.role_changed",
    target: userId,
    metadata: { from: target.role, to: role },
  })
  revalidateOrg(orgSlug)
  return ok("Role updated")
}

export async function updateSso(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!ssoEnabled()) return fail("SAML SSO is disabled for this deployment")
  const orgSlug = field(formData, "orgSlug")
  const check = await adminOrgAccess(orgSlug)
  if ("error" in check) return fail(check.error)
  if (check.access.role !== "owner") return fail("Only the owner can change SSO")
  const enabled = field(formData, "enabled") === "true"
  const admin = createAdminClient()
  const { error } = await admin
    .from("orgs")
    .update({ sso_enabled: enabled })
    .eq("id", check.access.org.id)
  if (error) return fail(errorMessage(error))
  await audit({
    orgId: check.access.org.id,
    actorId: check.access.user.id,
    action: "org.sso_changed",
    metadata: { enabled },
  })
  revalidateOrg(orgSlug)
  return ok(enabled ? "SSO flag enabled" : "SSO flag disabled")
}

