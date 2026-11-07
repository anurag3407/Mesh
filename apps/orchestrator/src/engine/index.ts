import type { RunLlmTurnArgs, TurnResult } from "../runner/llm"
import { runLlmTurn } from "../runner/llm"
import { runEngineTurn } from "./run"

export * from "./context"
export * from "./run"

export async function startAgentTurn(args: RunLlmTurnArgs): Promise<TurnResult> {
  const engine = (args.agent.params as Record<string, unknown> | null)?.engine ?? "v2"
  if (engine === "v1") return runLlmTurn(args)
  if (engine === "v2") return runEngineTurn(args)
  throw new Error(`Unsupported agent engine: ${String(engine)}`)
}
