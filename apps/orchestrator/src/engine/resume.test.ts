import { describe, expect, it } from "vitest"
import { buildToolIdempotencyKey } from "./resume"

describe("Parking and Resume (E5)", () => {
  it("builds deterministic tool idempotency keys", () => {
    const key = buildToolIdempotencyKey("run-uuid-1", 3, 0)
    expect(key).toBe("run-uuid-1:3:0")
  })
})
