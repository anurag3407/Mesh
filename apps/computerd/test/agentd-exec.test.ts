import { mkdtempSync, realpathSync, rmSync } from "node:fs"
import { connect, type Server } from "node:net"
import { join } from "node:path"
import { StringDecoder } from "node:string_decoder"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { startAgentd } from "../agentd/agentd"

let dir: string
let sock: string
let server: Server

beforeAll(async () => {
  dir = realpathSync(mkdtempSync("/tmp/agentd-exec-"))
  sock = join(dir, "agentd.sock")
  server = startAgentd(sock)
  await new Promise((r) => setTimeout(r, 50))
})
afterAll(() => {
  server.close()
  rmSync(dir, { recursive: true, force: true })
})

function rpc(req: Record<string, unknown>): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const frames: any[] = []
    let buf = ""
    const decoder = new StringDecoder("utf8")
    const socket = connect(sock, () => socket.write(JSON.stringify(req) + "\n"))
    socket.on("data", (chunk) => {
      buf += decoder.write(chunk)
      const lines = buf.split("\n")
      buf = lines.pop() ?? ""
      for (const line of lines) {
        if (!line) continue
        const frame = JSON.parse(line)
        frames.push(frame)
        if (frame.t === "exit" || frame.error) {
          socket.end()
          resolve(frames)
        }
      }
    })
    socket.on("error", reject)
  })
}

describe("agentd exec", () => {
  it("reports timeouts and kills the whole process group", async () => {
    const marker = join(dir, "survived")
    const frames = await rpc({
      op: "exec",
      cwd: dir,
      timeoutMs: 300,
      cmd: `(sleep 1 && touch ${marker}) & sleep 5`,
    })
    const exit = frames.at(-1)
    expect(exit).toMatchObject({ t: "exit", code: 124, timedOut: true })
    await new Promise((r) => setTimeout(r, 1_300))
    const { existsSync } = await import("node:fs")
    expect(existsSync(marker)).toBe(false)
  })

  it("keeps multibyte output intact and returns the real exit code", async () => {
    const frames = await rpc({ op: "exec", cwd: dir, cmd: `printf '世界%.0s' $(seq 1 20000); exit 3` })
    const out = frames.filter((f) => f.t === "out").map((f) => f.d).join("")
    expect(out).toBe("世界".repeat(20000))
    expect(frames.at(-1)).toMatchObject({ t: "exit", code: 3 })
  })

  it("rejects background requests explicitly", async () => {
    const frames = await rpc({ op: "exec", cwd: dir, cmd: "true", background: true })
    expect(frames[0].error).toContain("Background")
  })
})
