import { turnSessions } from "@mesh/db"
import { and, eq } from "drizzle-orm"
import { abortRoomRuns } from "../active-runs"
import { getDb, notify } from "../db"

export const INTERRUPT_CHANNEL = "mesh_room_interrupt"

/**
 * New human input wins immediately: mark active sessions superseded, abort any
 * in-flight run in this process, and tell every other instance to do the same.
 */
export async function interruptRoom(roomId: string): Promise<void> {
  await getDb()
    .update(turnSessions)
    .set({ state: "superseded", updatedAt: new Date() })
    .where(and(eq(turnSessions.roomId, roomId), eq(turnSessions.state, "active")))
  abortRoomRuns(roomId)
  await notify(INTERRUPT_CHANNEL, { roomId }).catch(() => {})
}
