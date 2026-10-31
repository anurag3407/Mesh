import type { Metadata } from "next"
import { requireOrgAccess } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { loadInbox } from "@/lib/queries-ia"
import { InboxView } from "@/components/ia/inbox-view"

export const metadata: Metadata = { title: "Inbox" }

export default async function InboxPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  const supabase = await createSupabaseServerClient()
  const [data, roomAdminRes] = await Promise.all([
    loadInbox(access),
    supabase
      .from("room_members")
      .select("room_id")
      .eq("user_id", access.user.id)
      .eq("role", "admin"),
  ])
  const adminRoomIds = ((roomAdminRes.data ?? []) as { room_id: string }[]).map(
    (row) => row.room_id,
  )
  return (
    <InboxView
      orgSlug={orgSlug}
      approvals={data.approvals}
      requests={data.requests}
      done={data.done}
      orgAdmin={access.role === "owner" || access.role === "admin"}
      adminRoomIds={adminRoomIds}
    />
  )
}
