import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const requestedNext = url.searchParams.get("next") ?? "/"
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/"

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin))
    }
    console.error("[auth] code exchange failed", error.message)
  }
  return NextResponse.redirect(new URL("/login?error=auth", url.origin))
}
