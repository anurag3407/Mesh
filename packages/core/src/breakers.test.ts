import { describe, expect, it } from "vitest"
import { checkPreTurnBreakers } from "./breakers"

const base = {
  botTurnsUsed: 0,
  turnCap: 3,
  rpmUsed: 0,
  rpmLimit: 20,
  spentUsd: 0,
  dailyBudgetUsd: 5,
}

describe("checkPreTurnBreakers", () => {
  it("allows a turn under every limit", () => {
    expect(checkPreTurnBreakers(base)).toBeNull()
  })

  it("trips the hard turn cap first", () => {
    const trip = checkPreTurnBreakers({ ...base, botTurnsUsed: 3, rpmUsed: 99, spentUsd: 99 })
    expect(trip?.code).toBe("turn_cap")
    expect(trip?.message).toContain("turn cap")
  })

  it("trips the rpm limit before the budget", () => {
    const trip = checkPreTurnBreakers({ ...base, rpmUsed: 20, spentUsd: 99 })
    expect(trip?.code).toBe("rpm_limit")
  })

  it("trips the daily budget", () => {
    const trip = checkPreTurnBreakers({ ...base, spentUsd: 5 })
    expect(trip?.code).toBe("daily_budget")
    expect(trip?.message).toContain("$5.0000")
  })

  it("treats null limits as unlimited", () => {
    expect(
      checkPreTurnBreakers({ ...base, rpmLimit: null, dailyBudgetUsd: null, spentUsd: 1e9 }),
    ).toBeNull()
  })

  it("halts when a tiny budget is already exceeded", () => {
    const trip = checkPreTurnBreakers({ ...base, dailyBudgetUsd: 0.0001, spentUsd: 0.0002 })
    expect(trip?.code).toBe("daily_budget")
  })
})
