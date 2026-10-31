import type { Metadata } from "next"
import { requireOrgAccess } from "@/lib/auth"
import { loadBotChats, loadChatList } from "@/lib/queries-ia"
import { ChatsView } from "@/components/ia/chats-view"

export const metadata: Metadata = { title: "Chats" }

export default async function OrgHomePage({ params }: { params: Promise<{ org: string }> }) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  const [chatData, handoffs] = await Promise.all([loadChatList(access), loadBotChats(access)])

  return (
    <ChatsView
      orgSlug={orgSlug}
      items={chatData.items}
      handoffs={handoffs}
      inboxCount={chatData.inboxCount}
    />
  )
}
