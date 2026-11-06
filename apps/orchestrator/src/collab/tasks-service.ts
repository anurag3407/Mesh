import { and, eq, inArray } from "drizzle-orm"
import {
  type Db,
  taskComments,
  taskEvents,
  tasks,
  type OutcomeKind,
  type UnblockNeeds,
} from "@mesh/db"
import { getDb } from "../db"

export class CollabError extends Error {}

export interface TaskMutationActor {
  type: "human" | "agent" | "system"
  id: string
}

export interface TaskMutationInput {
  taskId: string
  actor: TaskMutationActor
  status?: "open" | "in_progress" | "stuck" | "done"
  title?: string
  description?: string
  assigneeUserId?: string | null
  assigneeAgentId?: string | null
  dueAt?: Date | string | null
  unblockNeeds?: UnblockNeeds | null
  unblockDetail?: string | null
  blockedBy?: string[] | null
  outcome?: {
    kind: OutcomeKind
    ref?: string | null
  } | null
  reason?: string | null
  note?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Single service-layer write path for all task mutations.
 * Enforces:
 * 1. Title immutability.
 * 2. Status invariants:
 *    - done requires completed_at and outcome_kind; outcome_kind='none' requires human actor.
 *    - stuck requires unblock_needs.
 *    - moving to in_progress with unresolved blockers requires an explicit reason.
 * 3. Same-room check for all blocked_by tasks.
 * 4. Atomic transaction updating tasks row and appending task_events row.
 */
export async function applyTaskMutation(input: TaskMutationInput, dbOverride?: Db) {
  const db = dbOverride || getDb()

  return await db.transaction(async (tx) => {
    const [task] = await tx
      .select()
      .from(tasks)
      .where(eq(tasks.id, input.taskId))
      .limit(1)

    if (!task) {
      throw new CollabError("task not found")
    }

    // Invariant 1: Title is immutable after creation
    if (input.title !== undefined && input.title !== task.title) {
      throw new CollabError("title is immutable after creation")
    }

    // Validate blockedBy array if provided
    const nextBlockedBy =
      input.blockedBy !== undefined ? (input.blockedBy ?? []) : (task.blockedBy || [])

    if (input.blockedBy !== undefined && input.blockedBy && input.blockedBy.length > 0) {
      if (input.blockedBy.includes(task.id)) {
        throw new CollabError("task cannot be blocked by itself")
      }
      const blockers = await tx
        .select({ id: tasks.id, roomId: tasks.roomId, status: tasks.status })
        .from(tasks)
        .where(inArray(tasks.id, input.blockedBy))

      if (blockers.length !== input.blockedBy.length) {
        throw new CollabError("one or more blocked_by tasks do not exist")
      }
      for (const b of blockers) {
        if (b.roomId !== task.roomId) {
          throw new CollabError("blocked_by tasks must belong to the same room")
        }
      }
    }

    const toStatus = input.status ?? task.status
    const isStatusChanging = input.status !== undefined && input.status !== task.status

    // Invariant 2: Done requires completed_at and outcome_kind; none requires human actor
    const effectiveOutcomeKind = input.outcome?.kind ?? task.outcomeKind
    const effectiveOutcomeRef =
      input.outcome?.ref !== undefined ? input.outcome.ref : task.outcomeRef

    if (toStatus === "done") {
      if (!effectiveOutcomeKind) {
        throw new CollabError("done tasks require an outcome (kind and optional ref)")
      }
      if (effectiveOutcomeKind === "none" && input.actor.type !== "human") {
        throw new CollabError(
          "agents cannot close tasks with outcome 'none'; an artifact, submission, external_change, or decision is required",
        )
      }
    }

    // Invariant 3: Stuck requires unblock_needs
    const effectiveUnblockNeeds =
      input.unblockNeeds !== undefined ? input.unblockNeeds : task.unblockNeeds
    if (toStatus === "stuck" && !effectiveUnblockNeeds) {
      throw new CollabError("marking a task stuck requires unblock_needs")
    }

    // Invariant 4: Moving to in_progress with open blockers requires explicit reason
    if (toStatus === "in_progress" && nextBlockedBy.length > 0) {
      const blockers = await tx
        .select({ id: tasks.id, status: tasks.status })
        .from(tasks)
        .where(inArray(tasks.id, nextBlockedBy))

      const hasUnresolved = blockers.some((b) => b.status !== "done")
      if (hasUnresolved && (!input.reason || input.reason.trim().length === 0)) {
        throw new CollabError(
          "moving to in_progress with open blockers requires an explicit reason",
        )
      }
    }

    const now = new Date()
    const statusChangedAt = isStatusChanging ? now : task.statusChangedAt
    let completedAt = task.completedAt
    if (toStatus === "done") {
      completedAt = now
    } else if (isStatusChanging) {
      completedAt = null
    }

    const updates: Partial<typeof tasks.$inferInsert> = {
      status: toStatus,
      statusChangedAt,
      completedAt,
      updatedAt: now,
    }

    if (input.description !== undefined) updates.description = input.description
    if (input.assigneeUserId !== undefined) updates.assigneeUserId = input.assigneeUserId
    if (input.assigneeAgentId !== undefined) updates.assigneeAgentId = input.assigneeAgentId
    if (input.dueAt !== undefined) updates.dueAt = input.dueAt ? new Date(input.dueAt) : null
    if (input.unblockNeeds !== undefined) updates.unblockNeeds = input.unblockNeeds
    if (input.unblockDetail !== undefined) updates.unblockDetail = input.unblockDetail
    if (input.blockedBy !== undefined) updates.blockedBy = input.blockedBy ?? []
    if (input.outcome !== undefined) {
      updates.outcomeKind = input.outcome?.kind ?? null
      updates.outcomeRef = input.outcome?.ref ?? null
    }
    if (input.metadata !== undefined) {
      updates.metadata = { ...(task.metadata as Record<string, unknown>), ...input.metadata }
    }

    const [updatedTask] = await tx
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, task.id))
      .returning()

    if (!updatedTask) {
      throw new CollabError("failed to update task")
    }

    const [event] = await tx
      .insert(taskEvents)
      .values({
        taskId: task.id,
        actorType: input.actor.type,
        actorId: input.actor.id,
        fromStatus: task.status,
        toStatus: toStatus,
        reason: input.reason ?? null,
        outcomeKind: updates.outcomeKind ?? task.outcomeKind ?? null,
        outcomeRef: updates.outcomeRef ?? task.outcomeRef ?? null,
        metadata: input.metadata ?? {},
        createdAt: now,
      })
      .returning()

    if (!event) {
      throw new CollabError("failed to record task event")
    }

    if (input.note && input.note.trim().length > 0) {
      await tx.insert(taskComments).values({
        taskId: task.id,
        authorType: input.actor.type,
        authorId: input.actor.id,
        content: input.note.trim().slice(0, 4_000),
        createdAt: now,
      })
    }

    return {
      task: updatedTask,
      event,
    }
  })
}
