import { Sandbox } from "@e2b/code-interpreter"
import { z } from "zod"
import { getEnv } from "../../env"
import type { ToolSpec } from "../audited"

export function sandboxTool(): ToolSpec {
  return {
    name: "code_sandbox",
    description:
      "Execute Python, JavaScript or Bash in an isolated E2B microVM (60 second limit, no host credentials). Use for calculations, data work, or validating code. Returns stdout, stderr, rich results and any error.",
    schema: z.object({
      language: z.enum(["python", "javascript", "bash"]),
      code: z.string().min(1).max(20_000),
      timeoutSeconds: z.number().int().min(1).max(60).optional(),
    }),
    dangerous: false,
    execute: async (input: {
      language: "python" | "javascript" | "bash"
      code: string
      timeoutSeconds?: number
    }, signal?: AbortSignal) => {
      const apiKey = getEnv().E2B_API_KEY
      if (!apiKey) {
        throw new Error("E2B is not configured. Add E2B_API_KEY to enable code_sandbox.")
      }
      const timeoutMs = Math.min(input.timeoutSeconds ?? 60, 60) * 1000
      const sandbox = await Sandbox.create({ apiKey, timeoutMs })
      const abort = () => {
        void sandbox.kill().catch(() => {})
      }
      signal?.addEventListener("abort", abort, { once: true })
      try {
        const language = input.language === "javascript" ? "javascript" : input.language
        const execution = await sandbox.runCode(input.code, { language, timeoutMs })
        return {
          stdout: execution.logs.stdout.join(""),
          stderr: execution.logs.stderr.join(""),
          results: execution.results.map((r) => r.text).filter((t): t is string => Boolean(t)),
          error: execution.error
            ? { name: execution.error.name, value: execution.error.value, traceback: execution.error.traceback }
            : null,
        }
      } finally {
        signal?.removeEventListener("abort", abort)
        await sandbox.kill().catch(() => {})
      }
    },
  }
}
