import { requireOrgAccess, listUserOrgs } from "@/lib/auth"
import { listRooms } from "@/lib/queries"
import { WorkspaceShell } from "@/components/workspace-shell"

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ org: string }>
}) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  const [rooms, orgs] = await Promise.all([
    listRooms(access.org.id),
    listUserOrgs(access.user.id),
  ])
  return (
    <WorkspaceShell
      org={{ slug: access.org.slug, name: access.org.name }}
      orgs={orgs}
      rooms={rooms}
      user={{ displayName: access.user.displayName, email: access.user.email }}
      role={access.role}
    >
      {children}
    </WorkspaceShell>
  )
}
