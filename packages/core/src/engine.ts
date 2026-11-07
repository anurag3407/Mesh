import { z } from "zod"

export interface EngineBudgetLimits {
  maxSteps: number
  maxWallMinutes: number
  maxUsd?: number
  compactAtTokens?: number
}

export interface EngineBudgetUsage {
  stepsTaken: number
  wallMs: number
  costUsd: number
  renderedTokens?: number
}

export interface BudgetCheckResult {
  allowed: boolean
  warningNearLimit?: boolean
  haltReason?: "max_steps" | "max_wall_time" | "max_usd"
  message?: string
}

/**
 * Checks whether an agent run is within its budget, and signals when 80% is reached
 * so the engine can append a wrap-up prompt.
 */
export function checkEngineBudget(
  limits: EngineBudgetLimits,
  usage: EngineBudgetUsage,
): BudgetCheckResult {
  if (usage.stepsTaken >= limits.maxSteps) {
    return {
      allowed: false,
      haltReason: "max_steps",
      message: `Step budget exhausted (${usage.stepsTaken}/${limits.maxSteps} steps).`,
    }
  }

  const maxWallMs = limits.maxWallMinutes * 60_000
  if (usage.wallMs >= maxWallMs) {
    return {
      allowed: false,
      haltReason: "max_wall_time",
      message: `Wall clock budget exhausted (${Math.round(usage.wallMs / 60_000)}m / ${limits.maxWallMinutes}m).`,
    }
  }

  if (limits.maxUsd !== undefined && usage.costUsd >= limits.maxUsd) {
    return {
      allowed: false,
      haltReason: "max_usd",
      message: `Cost budget exhausted ($${usage.costUsd.toFixed(4)} / $${limits.maxUsd.toFixed(4)}).`,
    }
  }

  const nearSteps = usage.stepsTaken >= Math.floor(limits.maxSteps * 0.8)
  const nearWall = usage.wallMs >= maxWallMs * 0.8
  const nearCost = limits.maxUsd !== undefined && usage.costUsd >= limits.maxUsd * 0.8

  return {
    allowed: true,
    warningNearLimit: nearSteps || nearWall || nearCost,
  }
}

/**
 * Determines whether a transcript needs compaction.
 */
export function shouldCompact(
  tokens: number,
  contextWindow: number,
  compactAtTokens?: number,
): boolean {
  const threshold = Math.min(contextWindow * 0.6, compactAtTokens ?? contextWindow * 0.6)
  return tokens >= threshold
}

export interface PlanItem {
  id: string
  title: string
  status: "pending" | "in_progress" | "done" | "blocked"
  note?: string
}

export const planItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["pending", "in_progress", "done", "blocked"]),
  note: z.string().optional(),
})

export const updatePlanSchema = z.object({
  items: z.array(planItemSchema),
})

/**
 * Merges updated plan items into an existing plan preserving item order.
 */
export function reducePlan(currentPlan: PlanItem[], updates: PlanItem[]): PlanItem[] {
  const map = new Map<string, PlanItem>()
  for (const item of currentPlan) {
    map.set(item.id, item)
  }
  for (const item of updates) {
    map.set(item.id, item)
  }
  return Array.from(map.values())
}
