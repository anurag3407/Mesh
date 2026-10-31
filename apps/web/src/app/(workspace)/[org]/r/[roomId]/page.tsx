import type { Metadata } from "next"
import { requireRoomAccess } from "@/lib/auth"
import { loadRoomPageData } from "@/lib/queries"
import { RoomWorkspace } from "@/components/room/room-workspace"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string; roomId: string }>
}): Promise<Metadata> {
  const { org, roomId } = await params
  const access = await requireRoomAccess(org, roomId)
  return { title: `#${access.room.name}` }
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ org: string; roomId: string }>
}) {
  const { org, roomId } = await params
  const access = await requireRoomAccess(org, roomId)
  const data = await loadRoomPageData(access)
  return <RoomWorkspace data={data} />
}
