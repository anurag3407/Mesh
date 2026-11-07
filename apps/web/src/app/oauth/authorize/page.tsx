import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/auth"
import { hashAgentApiKey } from "@mesh/core/server"
import { randomBytes } from "node:crypto"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{
    client_id?: string
    redirect_uri?: string
    response_type?: string
    code_challenge?: string
    code_challenge_method?: string
    state?: string
    scope?: string
    invite?: string
  }>
}

export default async function OAuthAuthorizePage({ searchParams }: Props) {
  const params = await searchParams
  const user = await getCurrentUser()

  if (!user) {
    const returnUrl = encodeURIComponent(`/oauth/authorize?${new URLSearchParams(params as any).toString()}`)
    redirect(`/login?return_to=${returnUrl}`)
  }

  const { client_id, redirect_uri, code_challenge, state, invite } = params

  if (!client_id || !redirect_uri || !code_challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
        <div className="max-w-md w-full bg-card p-6 rounded-xl border border-destructive/20 text-center">
          <h1 className="text-lg font-semibold text-destructive">Invalid OAuth Request</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Missing required OAuth parameters (client_id, redirect_uri, or code_challenge).
          </p>
        </div>
      </div>
    )
  }

  const admin = createAdminClient()

  // Fetch client details
  const { data: client } = await admin
    .from("oauth_clients")
    .select("client_name, redirect_uris")
    .eq("client_id", client_id)
    .maybeSingle()

  const clientName = client?.client_name || "External MCP Bot"

  // Fetch invite details if invite code provided
  let roomName = "Workspace Room"
  let roomId: string | null = null
  let orgId: string | null = null

  if (invite) {
    const inviteHash = hashAgentApiKey(invite)
    const { data: inviteRow } = await admin
      .from("room_invites")
      .select("id, room_id, org_id, rooms(name)")
      .eq("code_hash", inviteHash)
      .maybeSingle()

    if (inviteRow) {
      roomId = inviteRow.room_id
      orgId = inviteRow.org_id
      roomName = (inviteRow.rooms as any)?.name || roomName
    }
  }

  async function handleAuthorize(formData: FormData) {
    "use server"

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("Unauthorized")
    }

    const chosenHandle = (formData.get("handle") as string)?.toLowerCase().trim() ||
      `${clientName.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36).slice(-4)}`

    const serverAdmin = createAdminClient()

    // 1. Create external agent
    let targetOrgId = orgId
    if (!targetOrgId) {
      const { data: member } = await serverAdmin
        .from("org_members")
        .select("org_id")
        .eq("user_id", currentUser.id)
        .limit(1)
        .maybeSingle()
      targetOrgId = member?.org_id || null
    }

    if (!targetOrgId) {
      throw new Error("No organization found for authorization")
    }

    const { data: agent, error: agentError } = await serverAdmin
      .from("agents")
      .insert({
        org_id: targetOrgId,
        handle: chosenHandle,
        display_name: `${clientName}`,
        kind: "external",
        visibility: "team",
        room_ids: roomId ? [roomId] : [],
      })
      .select()
      .single()

    if (agentError || !agent) {
      throw new Error(agentError?.message || "Failed to create agent")
    }

    if (roomId) {
      await serverAdmin.from("room_agents").insert({
        room_id: roomId,
        agent_id: agent.id,
      })
    }

    // 2. Issue authorization code
    const rawCode = `mesh_code_${randomBytes(24).toString("hex")}`
    const codeHash = hashAgentApiKey(rawCode)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const scopes = params.scope
      ? params.scope.split(/[\s,]+/).filter(Boolean)
      : ["room:read", "room:write", "tasks:read", "tasks:write", "canvas:read", "canvas:write", "secrets:use"]

    await serverAdmin.from("oauth_codes").insert({
      code_hash: codeHash,
      client_id: client_id!,
      agent_id: agent.id,
      code_challenge: code_challenge!,
      redirect_uri: redirect_uri!,
      scopes,
      expires_at: expiresAt,
    })

    const target = new URL(redirect_uri!)
    target.searchParams.set("code", rawCode)
    if (state) target.searchParams.set("state", state)

    redirect(target.toString())
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <div className="max-w-md w-full bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            S
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Authorize Bot Access</h1>
            <p className="text-xs text-muted-foreground">Sayabot MCP Connection</p>
          </div>
        </div>

        <div className="my-5 space-y-3">
          <p className="text-sm text-foreground">
            <strong className="font-medium text-foreground">{clientName}</strong> wants to connect to your room:
          </p>
          <div className="p-3 bg-muted/50 rounded-lg text-sm border border-border">
            <div className="font-medium">{roomName}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Permissions: read/post messages, task board, canvas access
            </div>
          </div>
        </div>

        <form action={handleAuthorize} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Bot handle in room
            </label>
            <div className="flex items-center rounded-lg border border-border bg-background px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary">
              <span className="text-muted-foreground text-sm select-none">@</span>
              <input
                type="text"
                name="handle"
                defaultValue={clientName.toLowerCase().replace(/[^a-z0-9]/g, "")}
                className="w-full bg-transparent px-1 text-sm outline-none"
                placeholder="bot-handle"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 py-2 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Authorize & Connect
            </button>
            <a
              href="/"
              className="py-2 px-4 rounded-lg border border-border text-muted-foreground hover:bg-muted text-sm font-medium text-center"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
