import { getEnv } from "../env"

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  truncated: boolean
}

export interface FileEntry {
  path: string
  type: "file" | "directory" | "other"
  size: number
  mtime: string
}

export class ComputerClient {
  private baseUrl: string
  private internalSecret: string

  constructor(baseUrl?: string, internalSecret?: string) {
    this.baseUrl = baseUrl || getEnv().COMPUTERD_URL
    this.internalSecret = internalSecret || getEnv().ORCHESTRATOR_INTERNAL_SECRET
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers = {
      "content-type": "application/json",
      "x-internal-secret": this.internalSecret,
      ...(init?.headers || {}),
    }

    const res = await fetch(url, { ...init, headers })
    if (!res.ok) {
      let errBody = ""
      try {
        errBody = await res.text()
      } catch {
        // ignore
      }
      throw new Error(`Computerd error (${res.status} ${res.statusText}): ${errBody || "Unknown error"}`)
    }

    return res.json() as Promise<T>
  }

  async ensure(agentId: string, orgId: string, profile: "standard" | "browser"): Promise<{ status: string; ip?: string }> {
    return this.request<{ status: string; ip?: string }>(`/v1/computers/${agentId}/ensure`, {
      method: "POST",
      body: JSON.stringify({ orgId, profile }),
    })
  }

  async exec(
    agentId: string,
    args: {
      cmd: string
      cwd?: string
      env?: Record<string, string>
      timeoutMs?: number
      stdin?: string
      runId?: string
      onChunk?: (chunk: string) => void
    },
    signal?: AbortSignal,
  ): Promise<ExecResult> {
    const url = `${this.baseUrl}/v1/computers/${agentId}/exec`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": this.internalSecret,
      },
      body: JSON.stringify(args),
      signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Execution failed (${res.status}): ${errText}`)
    }

    // Stream NDJSON responses
    const reader = res.body?.getReader()
    if (!reader) throw new Error("No response body available from computerd exec")

    const decoder = new TextDecoder()
    let buffer = ""
    let stdout = ""
    let stderr = ""
    let exitCode = 0
    let durationMs = 0
    let truncated = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const frame = JSON.parse(line) as {
            t: "out" | "err" | "exit"
            d?: string
            code?: number
            durationMs?: number
            truncated?: boolean
          }
          if (frame.t === "out" && frame.d) {
            stdout += frame.d
            args.onChunk?.(frame.d)
          } else if (frame.t === "err" && frame.d) {
            stderr += frame.d
            args.onChunk?.(frame.d)
          } else if (frame.t === "exit") {
            exitCode = frame.code ?? 0
            durationMs = frame.durationMs ?? 0
            truncated = Boolean(frame.truncated)
          }
        } catch {
          // ignore unparseable frame
        }
      }
    }

    return { stdout, stderr, exitCode, durationMs, truncated }
  }

  async readFile(
    agentId: string,
    args: { path: string; maxBytes?: number; encoding?: "utf8" | "base64" },
  ): Promise<{ content: string; size: number; truncated: boolean }> {
    return this.request(`/v1/computers/${agentId}/files/read`, {
      method: "POST",
      body: JSON.stringify(args),
    })
  }

  async writeFile(
    agentId: string,
    args: { path: string; content: string; encoding?: "utf8" | "base64"; mode?: number },
  ): Promise<{ bytes: number }> {
    return this.request(`/v1/computers/${agentId}/files/write`, {
      method: "POST",
      body: JSON.stringify(args),
    })
  }

  async listFiles(
    agentId: string,
    args: { path?: string; depth?: number },
  ): Promise<{ entries: FileEntry[] }> {
    return this.request(`/v1/computers/${agentId}/files/list`, {
      method: "POST",
      body: JSON.stringify(args),
    })
  }

  async browser(agentId: string, action: string, params: Record<string, unknown>): Promise<unknown> {
    return this.request(`/v1/computers/${agentId}/browser`, {
      method: "POST",
      body: JSON.stringify({ action, ...params }),
    })
  }

  async stop(agentId: string): Promise<{ ok: boolean }> {
    return this.request(`/v1/computers/${agentId}/stop`, {
      method: "POST",
    })
  }

  async stats(agentId: string): Promise<Record<string, unknown>> {
    return this.request(`/v1/computers/${agentId}/stats`, {
      method: "GET",
    })
  }
}

let defaultClient: ComputerClient | null = null

export function getComputerClient(): ComputerClient {
  if (!defaultClient) {
    defaultClient = new ComputerClient()
  }
  return defaultClient
}
