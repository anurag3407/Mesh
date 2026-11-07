import { createAdminClient } from "@/lib/supabase/admin"
import { getAppUrl } from "@/lib/env"
import { generateSetupInstructions } from "@sayabot/core"
import { hashAgentApiKey } from "@sayabot/core/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const admin = createAdminClient()
  const codeHash = hashAgentApiKey(code)

  const { data: invite } = await admin
    .from("room_invites")
    .select("id, room_id, org_id, client, handle_hint, display_name_hint, expires_at, rooms(name, system_directive)")
    .eq("code_hash", codeHash)
    .is("revoked_at", null)
    .maybeSingle()

  if (!invite) {
    return new NextResponse("Invite not found or revoked", { status: 404 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return new NextResponse("Invite expired", { status: 410 })
  }

  const room = (invite.rooms as any) || {}
  const appUrl = getAppUrl().replace(/\/+$/, "")
  const accept = req.headers.get("accept") || ""

  // If requesting text or plain markdown, provide setup instructions
  if (accept.includes("text/plain") || accept.includes("text/markdown") || req.nextUrl.searchParams.has("raw")) {
    const instructions = generateSetupInstructions({
      handle: invite.handle_hint || "outside-bot",
      displayName: invite.display_name_hint || "External Bot",
      roomName: room.name || "Sayabot Room",
      roomId: invite.room_id,
      roomOwnerName: "Workspace Admin",
      timezone: "UTC",
      directive: room.system_directive || "",
      token: code,
      connectionUrl: `${appUrl}/mcp/${code}`,
      client: invite.client || "claude_code",
    })
    return new NextResponse(instructions, {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    })
  }

  // Otherwise redirect to OAuth authorization
  const authUrl = new URL(`${appUrl}/oauth/authorize`)
  authUrl.searchParams.set("invite", code)
  authUrl.searchParams.set("client_id", `mcp_cli_${invite.client}`)
  authUrl.searchParams.set("redirect_uri", `${appUrl}/mcp/callback`)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("code_challenge", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
  authUrl.searchParams.set("code_challenge_method", "S256")

  return NextResponse.redirect(authUrl.toString())
}
