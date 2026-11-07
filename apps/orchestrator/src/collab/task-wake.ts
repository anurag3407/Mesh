import { agents, messages, rooms, tasks } from "@mesh/db"
import { eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { getDb, notify } from "../db"
import { enqueueRoomMessage, enqueueWebhook } from "../jobs"

export interface TaskWakeData {
  taskId: string
  agentId: string
  reason: "assigned" | "unblocked" | "synthesize" | "budget_extended"
}

export async function handleTaskWake(data: TaskWakeData): Promise<void> {
  const db = getDb()

  const [task] = await db.select().from(tasks).where(eq(tasks.id, data.taskId)).limit(1)
  if (!task) {
    console.warn(`[task.wake] task ${data.taskId} not found`)
    return
  }

  const [agent] = await db.select().from(agents).where(eq(agents.id, data.agentId)).limit(1)
  if (!agent) {
    console.warn(`[task.wake] agent ${data.agentId} not found`)
    return
  }

  const [room] = await db.select().from(rooms).where(eq(rooms.id, task.roomId)).limit(1)
  if (!room) {
    console.warn(`[task.wake] room ${task.roomId} not found`)
    return
  }

  const reasonLine =
    data.reason === "unblocked"
      ? "All dependencies have completed. You are unblocked."
      : data.reason === "synthesize"
        ? "All subtasks have completed! Please synthesize the findings into a final deliverable."
        : data.reason === "budget_extended"
          ? "Additional budget has been approved. Please resume work."
          : "You have been assigned to this task."

  if (agent.kind === "llm") {
    // Post system message in the task room
    const [systemMsg] = await db
      .insert(messages)
      .values({
        roomId: room.id,
        senderType: "system",
        senderId: null,
        content: `@${agent.handle} Task #${task.number} "${task.title}" is yours. ${reasonLine}`,
        status: "complete",
        mentions: [agent.handle],
        metadata: {
          taskWake: {
            taskId: task.id,
            agentIds: [agent.id],
            reason: data.reason,
          },
        },
      })
      .returning()

    if (systemMsg) {
      await enqueueRoomMessage(room.id, systemMsg.id)
    }
  } else {
    // Outside / external bot:
    // 1. Notify activity channel for long-polling MCP bots
    await notify("mesh_agent_inbox", {
      agentId: agent.id,
      roomId: room.id,
      kind: "task",
    })

    // 2. If webhook bot, deliver task.assigned webhook event
    if (agent.webhookUrl) {
      await enqueueWebhook({
        orgId: room.orgId,
        roomId: room.id,
        agentId: agent.id,
        messageId: randomUUID(),
        sessionId: randomUUID(),
        payload: {
          event: "task.assigned",
          room_id: room.id,
          task_id: task.id,
          task_number: task.number,
          title: task.title,
          description: task.description,
          reason: data.reason,
        },
      })
    }
  }
}
