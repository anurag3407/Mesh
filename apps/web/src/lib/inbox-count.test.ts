import { describe, expect, it } from "vitest"

export function computeInboxCount(
  pendingApprovalsCount: number,
  requests: Array<{ id: string; fold_key: string | null; expires_at: string | null }>,
  nowIso = new Date().toISOString(),
): number {
  const activeRequests = requests.filter((r) => !r.expires_at || r.expires_at > nowIso)
  const distinctQuestions = new Set(activeRequests.map((r) => r.fold_key || r.id)).size
  return pendingApprovalsCount + distinctQuestions
}

describe("Invariant 8: Inbox badge count", () => {
  it("counts distinct unexpired questions plus pending approvals", () => {
    const seededFixture = {
      pendingApprovals: 4,
      requests: [
        // Two requests sharing the same foldKey (repeated asks)
        { id: "req-1", fold_key: "key-budget-aws", expires_at: "2026-11-10T00:00:00Z" },
        { id: "req-2", fold_key: "key-budget-aws", expires_at: "2026-11-10T00:00:00Z" },
        // A distinct open question
        { id: "req-3", fold_key: "key-review-pr", expires_at: "2026-11-10T00:00:00Z" },
        // An expired request (>72h old)
        { id: "req-4", fold_key: "key-expired-ask", expires_at: "2026-11-01T00:00:00Z" },
        // Request without explicit fold_key
        { id: "req-5", fold_key: null, expires_at: "2026-11-10T00:00:00Z" },
      ],
    }

    const count = computeInboxCount(
      seededFixture.pendingApprovals,
      seededFixture.requests,
      "2026-11-06T12:00:00Z",
    )

    // Expected: 4 approvals + 3 distinct questions (key-budget-aws, key-review-pr, req-5) = 7
    // req-4 is excluded because expires_at is before now
    expect(count).toBe(7)
  })
})
