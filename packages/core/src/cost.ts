export interface TokenUsage {
  inputTokens?: number | null
  outputTokens?: number | null
}

export interface ModelPrice {
  inputPerMtok: number
  outputPerMtok: number
}

export const ZERO_PRICE: ModelPrice = { inputPerMtok: 0, outputPerMtok: 0 }

/** Cost in USD from per-million-token prices, rounded to six decimals. */
export function computeCostUsd(usage: TokenUsage, price: ModelPrice | null | undefined): number {
  if (!price) return 0
  const input = usage.inputTokens ?? 0
  const output = usage.outputTokens ?? 0
  const cost = (input / 1_000_000) * price.inputPerMtok + (output / 1_000_000) * price.outputPerMtok
  return Math.round(cost * 1e6) / 1e6
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(value < 0.01 ? 6 : 2)}`
}
