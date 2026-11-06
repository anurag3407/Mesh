import { describe, expect, it } from "vitest"
import { applyTaskMutation, CollabError } from "./tasks-service"

interface MockTask {
  id: string
  number: number
  orgId: string
  roomId: string
  kind: "task" | "request"
  title: string
  description: string
  status: "open" | "in_progress" | "stuck" | "done"
  assigneeUserId: string | null
  assigneeAgentId: string | null
  dueAt: Date | null
  statusChangedAt: Date
  completedAt: Date | null
  unblockNeeds: string | null
  unblockDetail: string | null
  blockedBy: string[]
  outcomeKind: string | null
  outcomeRef: string | null
  metadata: Record<string, unknown>
}

function createMockDb(initialTasks: MockTask[]) {
  const tasksMap = new Map(initialTasks.map((t) => [t.id, { ...t }]))
  const events: any[] = []
  const comments: any[] = []

  const tx: any = {
    select: () => ({
      from: (table: any) => ({
        where: (condition: any) => {
          // If checking by input.taskId limit(1)
          const queryResult = (taskId?: string) => {
            if (taskId) {
              const row = tasksMap.get(taskId)
              return row ? [{ ...row }] : []
            }
            return Array.from(tasksMap.values()).map((r) => ({ ...r }))
          }
          return {
            limit: (n: number) => {
              // Return matching or first
              return queryResult().slice(0, n)
            },
            then: (resolve: any) => {
              return Promise.resolve(resolve(Array.from(tasksMap.values())))
            },
          }
        },
      }),
    }),
    update: () => ({
      set: (updates: any) => ({
        where: () => ({
          returning: async () => {
            const row = Array.from(tasksMap.values())[0]
            if (row) Object.assign(row, updates)
            return row ? [row] : []
          },
        }),
      }),
    }),
    insert: (table: any) => ({
      values: (vals: any) => {
        const row = { id: `event-${events.length + 1}`, ...vals }
        events.push(row)
        return {
          returning: async () => [row],
          then: (resolve: any) => Promise.resolve(resolve([row])),
        }
      },
    }),
  }

  const db: any = {
    transaction: async (cb: any) => cb(tx),
  }

  return { db, tasksMap, events, comments }
}

describe("applyTaskMutation invariant checks", () => {
  const baseTask: MockTask = {
    id: "task-1",
    number: 101,
    orgId: "org-1",
    roomId: "room-1",
    kind: "task",
    title: "Implement indexing for search",
    description: "Build fast vector search",
    status: "open",
    assigneeUserId: null,
    assigneeAgentId: "agent-1",
    dueAt: null,
    statusChangedAt: new Date("2026-11-01T10:00:00Z"),
    completedAt: null,
    unblockNeeds: null,
    unblockDetail: null,
    blockedBy: [],
    outcomeKind: null,
    outcomeRef: null,
    metadata: {},
  }

  it("invariant: title is immutable after creation", async () => {
    const { db } = createMockDb([baseTask])
    await expect(
      applyTaskMutation(
        {
          taskId: "task-1",
          actor: { type: "agent", id: "agent-1" },
          title: "Renamed Title Should Fail",
        },
        db,
      ),
    ).rejects.toThrow("title is immutable after creation")
  })

  it("invariant: done requires completed_at and outcome_kind", async () => {
    const { db } = createMockDb([baseTask])
    await expect(
      applyTaskMutation(
        {
          taskId: "task-1",
          actor: { type: "agent", id: "agent-1" },
          status: "done",
          // outcome omitted
        },
        db,
      ),
    ).rejects.toThrow("done tasks require an outcome (kind and optional ref)")
  })

  it("invariant: done with outcome.kind = 'none' is human-only", async () => {
    const { db } = createMockDb([baseTask])
    await expect(
      applyTaskMutation(
        {
          taskId: "task-1",
          actor: { type: "agent", id: "agent-1" },
          status: "done",
          outcome: { kind: "none" },
        },
        db,
      ),
    ).rejects.toThrow("agents cannot close tasks with outcome 'none'")

    // Human actor with outcome 'none' succeeds
    const result = await applyTaskMutation(
      {
        taskId: "task-1",
        actor: { type: "human", id: "user-1" },
        status: "done",
        outcome: { kind: "none" },
      },
      db,
    )
    expect(result.task.status).toBe("done")
    expect(result.task.outcomeKind).toBe("none")
    expect(result.task.completedAt).not.toBeNull()
  })

  it("invariant: stuck requires unblock_needs", async () => {
    const { db } = createMockDb([baseTask])
    await expect(
      applyTaskMutation(
        {
          taskId: "task-1",
          actor: { type: "agent", id: "agent-1" },
          status: "stuck",
          // unblockNeeds omitted
        },
        db,
      ),
    ).rejects.toThrow("marking a task stuck requires unblock_needs")
  })

  it("invariant: stuck with unblock_needs succeeds and records event", async () => {
    const { db, events } = createMockDb([baseTask])
    const result = await applyTaskMutation(
      {
        taskId: "task-1",
        actor: { type: "agent", id: "agent-1" },
        status: "stuck",
        unblockNeeds: "human_answer",
        unblockDetail: "Waiting on AWS credential confirmation",
      },
      db,
    )
    expect(result.task.status).toBe("stuck")
    expect(result.task.unblockNeeds).toBe("human_answer")
    expect(events.length).toBe(1)
    expect(events[0].toStatus).toBe("stuck")
  })

  it("invariant: every status change writes exactly one task_events row in the same transaction", async () => {
    const { db, events } = createMockDb([baseTask])
    const res = await applyTaskMutation(
      {
        taskId: "task-1",
        actor: { type: "agent", id: "agent-1" },
        status: "done",
        outcome: { kind: "artifact", ref: "https://github.com/pull/42" },
      },
      db,
    )
    expect(res.task.status).toBe("done")
    expect(events.length).toBe(1)
    expect(events[0].fromStatus).toBe("open")
    expect(events[0].toStatus).toBe("done")
    expect(events[0].outcomeKind).toBe("artifact")
    expect(events[0].outcomeRef).toBe("https://github.com/pull/42")
  })
})
