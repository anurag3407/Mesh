import { turnSessions } from "@sayabot/db"
import { and, eq } from "drizzle-orm"
import { abortRoomRuns } from "../active-runs"
import { getDb, notify } from "../db"
import { handleMidRunInterrupt, type MessageInterruptCheck } from "../engine/interrupts"

export const INTERRUPT_CHANNEL = "mesh_room_interrupt"

/**
 * New human input handling:
 * In v2, if the message mentions an actively running agent, the steering message is delivered
 * directly to the agent's run without superseding or aborting it.
 * Otherwise, mark active sessions superseded and abort any in-flight run.
 */
export async function interruptRoom(roomId: string, incoming?: MessageInterruptCheck): Promise<void> {
  if (incoming && incoming.senderType === "human") {
    const result = handleMidRunInterrupt(roomId, incoming)
    if (result.steered) {
      // Steered into the running agent; do not mark session superseded
      return
    }
  }

  await getDb()
    .update(turnSessions)
    .set({ state: "superseded", updatedAt: new Date() })
    .where(and(eq(turnSessions.roomId, roomId), eq(turnSessions.state, "active")))
  abortRoomRuns(roomId)
  await notify(INTERRUPT_CHANNEL, { roomId }).catch(() => {})
}
