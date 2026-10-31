"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { fail, field, ok } from "@/lib/actions/shared"
import type { ActionResult } from "@/lib/types"

const emailSchema = z.string().trim().email()

export async function sendMagicLink(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(field(formData, "email"))
  if (!parsed.success) return fail("Enter a valid email address")
  const supabase = await createSupabaseServerClient()
  const headerList = await headers()
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    headerList.get("origin") ||
    `http://${headerList.get("host") ?? "localhost:3000"}`
  ).replace(/\/+$/, "")
  const next = field(formData, "next") || "/"
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })
  if (error) {
    return fail("The sign-in email could not be sent. Try again in a moment.")
  }
  return ok("If that address can sign in, a link is on its way.")
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/login")
}
