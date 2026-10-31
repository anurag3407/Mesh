import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

export async function ensureBotDmRoom(args: {
  orgId: string
  userId: string
  agentId: string
  agentName: string
}): Promise<string> {
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("rooms")
    .select("id")
    .eq("agent_dm_user_id", args.userId)
    .eq("agent_dm_agent_id", args.agentId)
    .maybeSingle()
  if (existing) return existing.id

  const { data: room, error } = await admin
    .from("rooms")
    .insert({
      org_id: args.orgId,
      name: args.agentName,
      kind: "dm",
      turn_mode: "mentions",
      turn_cap: 3,
      timezone: "UTC",
      agent_dm_user_id: args.userId,
      agent_dm_agent_id: args.agentId,
      created_by: args.userId,
    })
    .select("id")
    .single()
  if (error || !room) {
    if (error?.code === "23505") {
      const { data: raced } = await admin
        .from("rooms")
        .select("id")
        .eq("agent_dm_user_id", args.userId)
        .eq("agent_dm_agent_id", args.agentId)
        .maybeSingle()
      if (raced) return raced.id
    }
    throw new Error(error?.message ?? "Could not open the bot chat")
  }
  await admin.from("room_members").insert({ room_id: room.id, user_id: args.userId, role: "admin" })
  await admin.from("room_agents").insert({ room_id: room.id, agent_id: args.agentId, position: 0 })
  await admin.from("room_reads").upsert(
    { user_id: args.userId, room_id: room.id, last_read_at: new Date().toISOString() },
    { onConflict: "user_id,room_id" },
  )
  return room.id
}
