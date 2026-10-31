import type { Metadata } from "next"
import { requireOrgAccess } from "@/lib/auth"
import { listRooms } from "@/lib/queries"
import { loadFiles } from "@/lib/queries-ia"
import { FilesView } from "@/components/ia/files-view"

export const metadata: Metadata = { title: "Files" }

export default async function FilesPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  const [files, rooms] = await Promise.all([loadFiles(access), listRooms(access.org.id)])
  return (
    <FilesView
      orgSlug={orgSlug}
      files={files}
      rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
    />
  )
}
