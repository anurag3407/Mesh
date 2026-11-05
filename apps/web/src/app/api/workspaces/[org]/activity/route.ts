import { NextResponse } from "next/server"
import { getOrgAccess } from "@/lib/auth"
import { loadChatList } from "@/lib/queries-ia"
import { createSupabaseServerClient } from "@/lib/supabase/server"

/** Sidebar data for the workspace, refetched by the shell when something changes. */
export async function GET(_request: Request, context: { params: Promise<{ org: string }> }) {
  const { org } = await context.params
  const access = await getOrgAccess(org)
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const supabase = await createSupabaseServerClient()
  const [chats, adminRooms] = await Promise.all([
    loadChatList(access),
    supabase
      .from("room_members")
      .select("room_id")
      .eq("user_id", access.user.id)
      .eq("role", "admin"),
  ])
  return NextResponse.json(
    {
      items: chats.items,
      inboxCount: chats.inboxCount,
      adminRoomIds: ((adminRooms.data ?? []) as { room_id: string }[]).map((row) => row.room_id),
    },
    { headers: { "cache-control": "no-store" } },
  )
}
