import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { safeNextPath } from "@/lib/safe-next"

const EMAIL_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
])

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as EmailOtpType | null
  const requestedNext = url.searchParams.get("next") ?? "/"
  const next = safeNextPath(requestedNext)
  const supabase = await createSupabaseServerClient()

  if (tokenHash && type && EMAIL_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return NextResponse.redirect(new URL(next, url.origin))
    console.error("[auth] token hash verification failed", error.message)
    return NextResponse.redirect(new URL("/login?error=auth", url.origin))
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin))
    }
    console.error("[auth] code exchange failed", error.message)
  }
  return NextResponse.redirect(new URL("/login?error=auth", url.origin))
}
