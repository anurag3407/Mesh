import type { Metadata } from "next"
import { requireOrgAccess } from "@/lib/auth"
import { loadMeetings } from "@/lib/queries-ia"
import { MeetingsView } from "@/components/ia/meetings-view"

export const metadata: Metadata = { title: "Meetings" }

export default async function MeetingsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  const data = await loadMeetings(access)
  return (
    <MeetingsView
      orgSlug={orgSlug}
      rooms={data.rooms.map((room) => ({ id: room.id, name: room.name, kind: room.kind }))}
      schedules={data.schedules}
      meetings={data.meetings}
    />
  )
}
