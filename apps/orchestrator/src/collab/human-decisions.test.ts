import { describe, expect, it, vi } from "vitest"

const pushNotifications: any[] = []

vi.mock("../push", () => ({
  notifyHumansNeeded: vi.fn((opts) => {
    pushNotifications.push(opts)
  }),
}))

import { requestHumanDecision } from "./index"

function createMockDb() {
  const tasksTable: any[] = []
  const eventsTable: any[] = []

  const db: any = {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            orderBy: () =>
              Promise.resolve([
                { id: "00000000-0000-0000-0000-000000000001", name: "general" },
              ]),
          }),
        }),
        where: () => ({
          limit: (n: number) => {
            const openReqs = tasksTable.filter(
              (t) => t.kind === "request" && t.status === "open",
            )
            return openReqs.slice(0, n)
          },
        }),
      }),
    }),
    update: () => ({
      set: (updates: any) => ({
        where: () => {
          const req = tasksTable.find((t) => t.kind === "request" && t.status === "open")
          if (req) Object.assign(req, updates)
          return [req]
        },
      }),
    }),
    insert: (table: any) => ({
      values: (vals: any) => ({
        returning: async () => {
          const row = { id: `req-${tasksTable.length + 1}`, number: tasksTable.length + 1, ...vals }
          tasksTable.push(row)
          return [row]
        },
        then: (resolve: any) => {
          eventsTable.push(vals)
          return Promise.resolve(resolve([vals]))
        },
      }),
    }),
  }

  return { db, tasksTable, eventsTable }
}

describe("requestHumanDecision deduplication & folding", () => {
  const agent = {
    agentId: "agent-1",
    orgId: "org-1",
    handle: "testbot",
  }
  const roomId = "00000000-0000-0000-0000-000000000001"

  it("invariant: two calls with matching foldKey produce one open request with asked_count=2", async () => {
    pushNotifications.length = 0
    const { db, tasksTable } = createMockDb()

    // Mock getDb in collab
    const dbModule = await import("../db")
    vi.spyOn(dbModule, "getDb").mockReturnValue(db)

    // Call 1: initial request
    const res1 = await requestHumanDecision(agent, {
      roomId,
      question: "Can you please approve the budget for AWS?",
    })

    expect(res1.folded).toBe(false)
    expect(res1.asked_count).toBe(1)
    expect(tasksTable.length).toBe(1)
    expect(pushNotifications.length).toBe(1)

    // Call 2: repeated question (different wording with pleasantries)
    const res2 = await requestHumanDecision(agent, {
      roomId,
      question: "Hey, approve the AWS budget!",
    })

    expect(res2.folded).toBe(true)
    expect(res2.asked_count).toBe(2)
    expect(res2.request_id).toBe(res1.request_id)
    // Invariant: no duplicate row created
    expect(tasksTable.length).toBe(1)
    // Invariant: no duplicate push sent on repeated ask
    expect(pushNotifications.length).toBe(1)
  })
})
