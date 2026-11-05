import { agents, orgMembers, orgs, pushSubscriptions, roomMembers, rooms } from "@mesh/db"
import { and, eq, inArray } from "drizzle-orm"
import webpush from "web-push"
import { getDb } from "./db"
import { getEnv } from "./env"

const PUSH_TTL_SECONDS = 300

let configured: boolean | null = null

function pushReady(): boolean {
  if (configured !== null) return configured
  const env = getEnv()
  configured = Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT)
  if (configured) {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT!,
      env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      env.VAPID_PRIVATE_KEY!,
    )
  }
  return configured
}

/** Everyone who is able to decide on an approval in this room. */
async function roomApprovers(roomId: string): Promise<{ orgId: string; userIds: string[] } | null> {
  const db = getDb()
  const [room] = await db.select({ orgId: rooms.orgId }).from(rooms).where(eq(rooms.id, roomId)).limit(1)
  if (!room) return null
  const [admins, orgAdmins] = await Promise.all([
    db
      .select({ userId: roomMembers.userId })
      .from(roomMembers)
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.role, "admin"))),
    db
      .select({ userId: orgMembers.userId })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, room.orgId), inArray(orgMembers.role, ["owner", "admin"]))),
  ])
  return {
    orgId: room.orgId,
    userIds: [...new Set([...admins, ...orgAdmins].map((row) => row.userId))],
  }
}

async function sendToUsers(
  userIds: string[],
  payload: { title: string; body: string; url: string; tag: string },
): Promise<void> {
  if (!userIds.length) return
  const db = getDb()
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds))
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
          { TTL: PUSH_TTL_SECONDS },
        )
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        // The browser dropped this subscription, so it can never be delivered again.
        if (status === 404 || status === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id))
        } else {
          console.warn("[push] delivery failed", status ?? error)
        }
      }
    }),
  )
}

async function agentName(agentId: string): Promise<string> {
  const [agent] = await getDb()
    .select({ name: agents.displayName })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1)
  return agent?.name ?? "An agent"
}

/**
 * Alerts people who can act when an agent stops to wait for them. Delivery is best effort and
 * never holds up the agent: failures are logged, and the Inbox still has the item.
 */
export function notifyHumansNeeded(args: {
  roomId: string
  agentId: string
  kind: "approval" | "request"
  detail: string
}): void {
  if (!pushReady()) return
  void (async () => {
    const approvers = await roomApprovers(args.roomId)
    if (!approvers) return
    const [org, who] = await Promise.all([
      getDb().select({ slug: orgs.slug }).from(orgs).where(eq(orgs.id, approvers.orgId)).limit(1),
      agentName(args.agentId),
    ])
    const slug = org[0]?.slug
    if (!slug) return
    await sendToUsers(approvers.userIds, {
      title: args.kind === "approval" ? `${who} needs your approval` : `${who} has a question`,
      body:
        args.kind === "approval"
          ? `Wants to use ${args.detail}. It expires in 5 minutes.`
          : args.detail,
      url: `/${slug}/inbox`,
      tag: `mesh-${args.kind}-${args.roomId}`,
    })
  })().catch((error) => console.warn("[push] could not send alert", error))
}
