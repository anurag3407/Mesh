import { orgMembers, roomAgents, roomMembers, rooms } from "@sayabot/db"
import { and, eq } from "drizzle-orm"
import { getDb } from "./db"

export async function canUserReadRoom(userId: string, roomId: string): Promise<boolean> {
  const db = getDb()
  const [member] = await db
    .select({ userId: roomMembers.userId })
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
    .limit(1)
  if (member) return true
  const [room] = await db
    .select({ kind: rooms.kind, orgId: rooms.orgId })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1)
  if (!room || room.kind !== "public") return false
  const [orgMember] = await db
    .select({ userId: orgMembers.userId })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, room.orgId), eq(orgMembers.userId, userId)))
    .limit(1)
  return Boolean(orgMember)
}

export async function isAgentInRoom(agentId: string, roomId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ agentId: roomAgents.agentId })
    .from(roomAgents)
    .where(and(eq(roomAgents.roomId, roomId), eq(roomAgents.agentId, agentId)))
    .limit(1)
  return Boolean(row)
}
