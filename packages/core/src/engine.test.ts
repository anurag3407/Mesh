import { describe, it, expect } from "vitest"
import { checkEngineBudget, shouldCompact, reducePlan } from "./engine"

describe("checkEngineBudget", () => {
  it("allows execution within limits", () => {
    const res = checkEngineBudget(
      { maxSteps: 60, maxWallMinutes: 30 },
      { stepsTaken: 10, wallMs: 60_000, costUsd: 0.05 },
    )
    expect(res.allowed).toBe(true)
    expect(res.warningNearLimit).toBe(false)
  })

  it("warns when near step limit (>= 80%)", () => {
    const res = checkEngineBudget(
      { maxSteps: 60, maxWallMinutes: 30 },
      { stepsTaken: 48, wallMs: 60_000, costUsd: 0.05 },
    )
    expect(res.allowed).toBe(true)
    expect(res.warningNearLimit).toBe(true)
  })

  it("halts when steps limit exceeded", () => {
    const res = checkEngineBudget(
      { maxSteps: 60, maxWallMinutes: 30 },
      { stepsTaken: 60, wallMs: 60_000, costUsd: 0.05 },
    )
    expect(res.allowed).toBe(false)
    expect(res.haltReason).toBe("max_steps")
  })

  it("halts when wall time limit exceeded", () => {
    const res = checkEngineBudget(
      { maxSteps: 60, maxWallMinutes: 1 },
      { stepsTaken: 1, wallMs: 61_000, costUsd: 0.01 },
    )
    expect(res.allowed).toBe(false)
    expect(res.haltReason).toBe("max_wall_time")
  })

  it("halts when cost limit exceeded", () => {
    const res = checkEngineBudget(
      { maxSteps: 60, maxWallMinutes: 30, maxUsd: 1.0 },
      { stepsTaken: 5, wallMs: 60_000, costUsd: 1.05 },
    )
    expect(res.allowed).toBe(false)
    expect(res.haltReason).toBe("max_usd")
  })
})

describe("shouldCompact", () => {
  it("triggers when tokens reach 60% of context window", () => {
    expect(shouldCompact(120_000, 200_000)).toBe(true)
    expect(shouldCompact(100_000, 200_000)).toBe(false)
  })

  it("honors custom compactAtTokens", () => {
    expect(shouldCompact(50_000, 200_000, 40_000)).toBe(true)
  })
})

describe("reducePlan", () => {
  it("updates existing items and appends new ones", () => {
    const initial = [
      { id: "1", title: "Task 1", status: "pending" as const },
      { id: "2", title: "Task 2", status: "pending" as const },
    ]
    const updates = [
      { id: "1", title: "Task 1", status: "done" as const },
      { id: "3", title: "Task 3", status: "in_progress" as const },
    ]
    const result = reducePlan(initial, updates)
    expect(result).toEqual([
      { id: "1", title: "Task 1", status: "done" },
      { id: "2", title: "Task 2", status: "pending" },
      { id: "3", title: "Task 3", status: "in_progress" },
    ])
  })
})
