export type BreakerCode = "turn_cap" | "rpm_limit" | "daily_budget"

export interface BreakerInput {
  botTurnsUsed: number
  turnCap: number
  rpmUsed: number
  rpmLimit: number | null
  spentUsd: number
  dailyBudgetUsd: number | null
}

export interface BreakerTrip {
  code: BreakerCode
  reason: string
  message: string
}

const HALT_LABEL = "Generation halted"

/**
 * Pre-turn circuit breakers, checked in priority order: hard turn cap, RPM,
 * then the daily dollar budget. Returns null when the turn may proceed.
 */
export function checkPreTurnBreakers(input: BreakerInput): BreakerTrip | null {
  if (input.botTurnsUsed >= input.turnCap) {
    return {
      code: "turn_cap",
      reason: "turn cap reached",
      message: `${HALT_LABEL}: this room's turn cap of ${input.turnCap} was reached. Human input is required to continue.`,
    }
  }
  if (input.rpmLimit !== null && input.rpmUsed >= input.rpmLimit) {
    return {
      code: "rpm_limit",
      reason: "requests per minute limit reached",
      message: `${HALT_LABEL}: the room's limit of ${input.rpmLimit} agent runs per minute was reached. Try again shortly.`,
    }
  }
  if (input.dailyBudgetUsd !== null && input.spentUsd >= input.dailyBudgetUsd) {
    return {
      code: "daily_budget",
      reason: "daily budget exhausted",
      message: `${HALT_LABEL}: the room's daily budget of $${input.dailyBudgetUsd.toFixed(4)} is exhausted (spent $${input.spentUsd.toFixed(4)}).`,
    }
  }
  return null
}

export const REPETITION_HALT_MESSAGE =
  "Generation halted: the agents started repeating each other. Human input is required to continue."
