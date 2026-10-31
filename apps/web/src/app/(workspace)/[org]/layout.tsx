import { requireOrgAccess, listUserOrgs } from "@/lib/auth"
import { listOrgAgents } from "@/lib/queries"
import { loadChatList } from "@/lib/queries-ia"
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
  const [chatData, orgAgents, orgs] = await Promise.all([
    loadChatList(access),
    listOrgAgents(access.org.id),
    listUserOrgs(access.user.id),
  ])
  return (
    <WorkspaceShell
      org={{ slug: access.org.slug, name: access.org.name }}
      orgs={orgs}
      chats={chatData.items}
      bots={orgAgents.map((agent) => ({
        id: agent.id,
        handle: agent.handle,
        displayName: agent.displayName,
        kind: agent.kind,
      }))}
      inboxCount={chatData.inboxCount}
      user={{
        displayName: access.user.displayName,
        avatarUrl: access.user.avatarUrl,
        email: access.user.email,
      }}
      role={access.role}
    >
      {children}
    </WorkspaceShell>
  )
}
