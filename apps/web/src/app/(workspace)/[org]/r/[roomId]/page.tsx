import type { Metadata } from "next"
import { requireRoomAccess } from "@/lib/auth"
import { devModelConfigured } from "@/lib/env"
import { listOrgAgents, listProviderKeys, loadRoomPageData } from "@/lib/queries"
import { RoomWorkspace } from "@/components/room/room-workspace"
import type { SetupState } from "@/components/room/setup-checklist"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string; roomId: string }>
}): Promise<Metadata> {
  const { org, roomId } = await params
  const access = await requireRoomAccess(org, roomId)
  return { title: access.room.name }
}

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string; roomId: string }>
  searchParams: Promise<{ canvas?: string; m?: string; thread?: string }>
}) {
  const { org, roomId } = await params
  const { canvas, m, thread } = await searchParams
  const access = await requireRoomAccess(org, roomId)
  const data = await loadRoomPageData(access)

  let setup: SetupState | null = null
  // Direct chats with an agent always have their agent, and a person-to-person chat needs none.
  if (data.roomAgents.length === 0 && data.room.kind !== "dm") {
    const [keys, agents] = await Promise.all([
      data.canAdmin ? listProviderKeys(access.org.id) : Promise.resolve([]),
      listOrgAgents(access.org.id),
    ])
    setup = {
      canManage: data.canAdmin,
      hasModel: keys.length > 0 || devModelConfigured(),
      hasAgent: agents.length > 0,
      roomHasAgent: false,
      hasMessage: data.messages.some((message) => message.senderType === "human"),
    }
  }

  return (
    <RoomWorkspace
      key={roomId}
      data={data}
      initialCanvasId={canvas ?? null}
      focusMessageId={m ?? null}
      initialThreadId={thread ? (m ?? null) : null}
      setup={setup}
    />
  )
}
