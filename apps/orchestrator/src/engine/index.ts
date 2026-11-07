import type { RunLlmTurnArgs, TurnResult } from "../runner/llm"
import { runLlmTurn } from "../runner/llm"
import { runEngineTurn } from "./run"

export * from "./context"
export * from "./run"

/**
 * Dispatches an agent turn to the appropriate engine based on agent.params.engine:
 * - "v1": existing runLlmTurn
 * - "v2": durable, step-persisted runEngineTurn
 * - "cli": CLI agent driver (WS3)
 */
export async function startAgentTurn(args: RunLlmTurnArgs): Promise<TurnResult> {
  const engine = (args.agent.params as Record<string, unknown> | null)?.engine ?? "v1"
  if (engine === "v2") {
    return runEngineTurn(args)
  }
  return runLlmTurn(args)
}
