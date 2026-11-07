import { type PlanItem, reducePlan, updatePlanSchema } from "@sayabot/core"
import { runTranscripts } from "@sayabot/db"
import { eq } from "drizzle-orm"
import { getDb } from "../db"
import { broadcast } from "../realtime"
import type { ToolSpec } from "../tools/audited"

export interface PlanToolArgs {
  runId: string
  roomId: string
}

/**
 * Checks if the engine should nudge the agent to create a plan.
 * Per spec: if run has made more than 8 steps with no plan, nudge "make a plan".
 */
export function shouldNudgePlan(stepsCount: number, currentPlan?: PlanItem[] | null): boolean {
  return stepsCount > 8 && (!currentPlan || currentPlan.length === 0)
}

/**
 * Checks if all items in the plan are completed.
 */
export function isPlanFinished(plan?: PlanItem[] | null): boolean {
  if (!plan || plan.length === 0) return false
  return plan.every((p) => p.status === "done")
}

/**
 * Built-in update_plan tool for Engine v2:
 * Always active in v2. Persists to run_transcripts.plan and broadcasts run.plan.
 */
export function updatePlanTool(args: PlanToolArgs): ToolSpec {
  return {
    name: "update_plan",
    description:
      "Update your current multi-step execution plan checklist. Call this when beginning complex tasks or whenever steps change status (pending -> in_progress -> done).",
    schema: updatePlanSchema,
    dangerous: false,
    execute: async (input: { items: PlanItem[] }) => {
      const db = getDb()

      const [existing] = await db
        .select({ plan: runTranscripts.plan })
        .from(runTranscripts)
        .where(eq(runTranscripts.runId, args.runId))
        .limit(1)

      const currentPlan = Array.isArray(existing?.plan) ? (existing.plan as PlanItem[]) : []
      const merged = reducePlan(currentPlan, input.items)

      await db
        .update(runTranscripts)
        .set({
          plan: merged,
          updatedAt: new Date(),
        })
        .where(eq(runTranscripts.runId, args.runId))

      await broadcast(args.roomId, {
        type: "run.plan",
        runId: args.runId,
        items: merged,
      })

      return {
        ok: true,
        itemsCount: merged.length,
        doneCount: merged.filter((i) => i.status === "done").length,
        plan: merged,
      }
    },
  }
}
