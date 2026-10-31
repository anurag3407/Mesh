import { describe, expect, it } from "vitest"
import { computeCostUsd, formatUsd } from "./cost"

describe("computeCostUsd", () => {
  it("prices input and output tokens per million", () => {
    expect(
      computeCostUsd({ inputTokens: 1_000_000, outputTokens: 500_000 }, {
        inputPerMtok: 2,
        outputPerMtok: 8,
      }),
    ).toBe(6)
  })

  it("returns zero without a price row", () => {
    expect(computeCostUsd({ inputTokens: 100 }, null)).toBe(0)
  })

  it("rounds to six decimals", () => {
    expect(
      computeCostUsd({ inputTokens: 1, outputTokens: 1 }, { inputPerMtok: 0.15, outputPerMtok: 0.6 }),
    ).toBe(0.000001)
  })
})

describe("formatUsd", () => {
  it("shows more precision for sub-cent amounts", () => {
    expect(formatUsd(0.000123)).toBe("$0.000123")
    expect(formatUsd(1.5)).toBe("$1.50")
  })
})
