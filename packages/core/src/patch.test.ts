import { describe, expect, it } from "vitest"
import { CanvasPatchError, planCanvasPatch } from "./patch"

const doc = "# Plan\n\nShip the migration.\n\nRun the tests."

describe("planCanvasPatch", () => {
  it("replaces a unique match and reports the splice", () => {
    const plan = planCanvasPatch(doc, [{ search: "migration", replace: "rollback" }])
    expect(plan.text).toContain("Ship the rollback.")
    expect(plan.splices).toEqual([{ from: 17, to: 26, insert: "rollback" }])
  })

  it("applies edits sequentially against the evolving text", () => {
    const plan = planCanvasPatch(doc, [
      { search: "Run the tests.", replace: "Run all tests twice." },
      { search: "all tests", replace: "the full suite" },
    ])
    expect(plan.text).toContain("Run the full suite twice.")
    expect(plan.splices).toHaveLength(2)
  })

  it("rejects a search that matches more than once", () => {
    expect(() => planCanvasPatch("a a", [{ search: "a", replace: "b" }])).toThrow(CanvasPatchError)
    expect(() => planCanvasPatch("a a", [{ search: "a", replace: "b" }])).toThrow(/2 times/)
  })

  it("rejects a missing search and an empty search", () => {
    expect(() => planCanvasPatch(doc, [{ search: "nope", replace: "x" }])).toThrow(/not found/)
    expect(() => planCanvasPatch(doc, [{ search: "", replace: "x" }])).toThrow(/empty/)
  })

  it("returns the snapshot unchanged for no edits", () => {
    expect(planCanvasPatch(doc, [])).toEqual({ text: doc, splices: [] })
  })
})
