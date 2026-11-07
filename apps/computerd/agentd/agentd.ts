import { spawn } from "node:child_process"
import { createServer, type Socket } from "node:net"
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, statSync, unlinkSync, writeFileSync } from "node:fs"
import { dirname, resolve, sep } from "node:path"

const SOCKET_PATH = process.env.AGENTD_SOCK || "/run/agentd.sock"
const BOT_HOME = process.env.BOT_HOME || "/home/bot"
const MAX_OUTPUT_BYTES = 1024 * 1024 // 1 MB cap

function getAllowedRoots(): string[] {
  const roots = ["/home/bot", "/tmp"]
  const botHome = process.env.BOT_HOME || "/home/bot"
  roots.push(botHome)

  for (const r of [botHome, "/home/bot", "/tmp"]) {
    try {
      if (existsSync(r)) {
        roots.push(realpathSync(r))
      }
    } catch {}
  }

  try {
    if (existsSync("/home")) {
      roots.push(resolve(realpathSync("/home"), "bot"))
    }
  } catch {}

  return [...new Set(roots)]
}

export function isSafePath(targetPath: string): boolean {
  try {
    const allowedRoots = getAllowedRoots()
    const resolved = resolve(targetPath)
    const segments = resolved.split(sep).filter(Boolean)

    let curr: string = sep // "/" on posix
    for (const segment of segments) {
      curr = resolve(curr, segment)
      let hops = 0
      while (lstatSync(curr, { throwIfNoEntry: false })?.isSymbolicLink()) {
        if (++hops > 40) return false
        const target = readlinkSync(curr)
        curr = resolve(dirname(curr), target)
      }
      try {
        if (existsSync(curr)) {
          curr = realpathSync(curr)
        }
      } catch {}
    }

    return allowedRoots.some((root) => curr === root || curr.startsWith(root + "/"))
  } catch {
    return false
  }
}

interface BackgroundJob {
  id: string
  cmd: string
  child: ReturnType<typeof spawn>
  startedAt: number
  output: string
  exitCode: number | null
}

const bgJobs = new Map<string, BackgroundJob>()

export function startAgentd(socketPath = SOCKET_PATH) {
  try {
    if (existsSync(socketPath)) unlinkSync(socketPath)
  } catch {}

  const server = createServer((client: Socket) => {
    let buffer = ""

    client.on("data", (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.trim()) continue
        handleRequest(client, line.trim())
      }
    })
  })

  server.listen(socketPath, () => {
    console.log(`[agentd] listening on ${socketPath}`)
  })

  return server
}

async function handleRequest(client: Socket, jsonStr: string) {
  let req: any
  try {
    req = JSON.parse(jsonStr)
  } catch {
    client.write(JSON.stringify({ error: "invalid json" }) + "\n")
    return
  }

  const { op } = req

  switch (op) {
    case "exec": {
      const { cmd, cwd = BOT_HOME, env = {}, timeoutMs = 60_000, stdin } = req
      const started = Date.now()
      let totalBytes = 0
      let truncated = false

      // Merge environment with /home/bot/.saaya/env
      const finalEnv: Record<string, string> = {
        ...process.env,
        HOME: BOT_HOME,
        ...env,
      }

      const child = spawn("bash", ["-c", cmd], {
        cwd,
        env: finalEnv,
        uid: process.getuid && process.getuid() === 0 ? 10001 : undefined,
        gid: process.getgid && process.getgid() === 0 ? 10001 : undefined,
      })

      const timeout = setTimeout(() => {
        child.kill("SIGTERM")
      }, timeoutMs)

      if (req.background) {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        const job: BackgroundJob = {
          id: jobId,
          cmd,
          child,
          startedAt: started,
          output: "",
          exitCode: null,
        }
        bgJobs.set(jobId, job)
        child.stdout?.on("data", (d) => { job.output += d.toString("utf8") })
        child.stderr?.on("data", (d) => { job.output += d.toString("utf8") })
        child.on("close", (code) => { job.exitCode = code ?? 1 })
        client.write(JSON.stringify({ t: "started", jobId, pid: child.pid }) + "\n")
        break
      }

      if (stdin) {
        child.stdin.write(stdin)
        child.stdin.end()
      }

      child.stdout.on("data", (data: Buffer) => {
        if (totalBytes >= MAX_OUTPUT_BYTES) {
          truncated = true
          return
        }
        totalBytes += data.length
        client.write(JSON.stringify({ t: "out", d: data.toString("utf8") }) + "\n")
      })

      child.stderr.on("data", (data: Buffer) => {
        if (totalBytes >= MAX_OUTPUT_BYTES) {
          truncated = true
          return
        }
        totalBytes += data.length
        client.write(JSON.stringify({ t: "err", d: data.toString("utf8") }) + "\n")
      })

      child.on("close", (code) => {
        clearTimeout(timeout)
        client.write(
          JSON.stringify({
            t: "exit",
            code: code ?? 1,
            durationMs: Date.now() - started,
            truncated,
          }) + "\n",
        )
      })
      break
    }

    case "read": {
      const { path, maxBytes = 2 * 1024 * 1024, encoding = "utf8" } = req
      if (!isSafePath(path)) {
        client.write(JSON.stringify({ error: "access denied: path must be inside /home/bot or /tmp" }) + "\n")
        return
      }
      try {
        const stats = statSync(path)
        const size = stats.size
        const truncated = size > maxBytes
        const content = readFileSync(path, { encoding: encoding === "base64" ? "base64" : "utf8" })
        client.write(
          JSON.stringify({
            content: truncated ? content.slice(0, maxBytes) : content,
            size,
            truncated,
          }) + "\n",
        )
      } catch (e: any) {
        client.write(JSON.stringify({ error: e.message }) + "\n")
      }
      break
    }

    case "write": {
      const { path, content, encoding = "utf8", mode = 0o644 } = req
      if (!isSafePath(path)) {
        client.write(JSON.stringify({ error: "access denied: path must be inside /home/bot or /tmp" }) + "\n")
        return
      }
      try {
        mkdirSync(dirname(path), { recursive: true })
        writeFileSync(path, content, { encoding: encoding as any, mode })
        client.write(JSON.stringify({ bytes: Buffer.byteLength(content) }) + "\n")
      } catch (e: any) {
        client.write(JSON.stringify({ error: e.message }) + "\n")
      }
      break
    }

    case "list": {
      const { path = BOT_HOME, depth = 2 } = req
      if (!isSafePath(path)) {
        client.write(JSON.stringify({ error: "access denied: path must be inside /home/bot or /tmp" }) + "\n")
        return
      }
      try {
        const entries: Array<{ path: string; type: "file" | "dir"; size: number; mtime: number }> = []

        function scan(dir: string, curDepth: number) {
          if (curDepth > depth || entries.length >= 2000) return
          const items = readdirSync(dir)
          for (const item of items) {
            if (item.startsWith(".git") && curDepth > 0) continue
            const full = resolve(dir, item)
            try {
              const stat = statSync(full)
              const isDir = stat.isDirectory()
              entries.push({
                path: full,
                type: isDir ? "dir" : "file",
                size: stat.size,
                mtime: Math.round(stat.mtimeMs),
              })
              if (isDir) scan(full, curDepth + 1)
            } catch {}
          }
        }

        scan(path, 1)
        client.write(JSON.stringify({ entries }) + "\n")
      } catch (e: any) {
        client.write(JSON.stringify({ error: e.message }) + "\n")
      }
      break
    }

    case "env.reload": {
      const { env = {} } = req
      try {
        const envPath = resolve(BOT_HOME, ".saaya/env")
        mkdirSync(dirname(envPath), { recursive: true })
        let fileContent = "# Generated by Sayabot platform\n"
        for (const [k, v] of Object.entries(env)) {
          fileContent += `export ${k}=${JSON.stringify(v)}\n`
        }
        writeFileSync(envPath, fileContent, { mode: 0o600 })
        client.write(JSON.stringify({ ok: true }) + "\n")
      } catch (e: any) {
        client.write(JSON.stringify({ error: e.message }) + "\n")
      }
      break
    }

    case "stats": {
      client.write(
        JSON.stringify({
          cpu: 0,
          memMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
          diskMb: 0,
          processes: 1,
          browserRunning: false,
          browserAvailable: false,
        }) + "\n",
      )
      break
    }

    case "job.status": {
      const { jobId } = req
      const job = bgJobs.get(jobId)
      if (!job) {
        client.write(JSON.stringify({ error: "Job not found" }) + "\n")
        return
      }
      client.write(
        JSON.stringify({
          jobId,
          status: job.exitCode === null ? "running" : "exited",
          exitCode: job.exitCode,
          durationMs: Date.now() - job.startedAt,
        }) + "\n",
      )
      break
    }

    case "job.output": {
      const { jobId, sinceBytes = 0 } = req
      const job = bgJobs.get(jobId)
      if (!job) {
        client.write(JSON.stringify({ error: "Job not found" }) + "\n")
        return
      }
      const chunk = job.output.slice(sinceBytes)
      client.write(
        JSON.stringify({
          jobId,
          output: chunk,
          totalBytes: job.output.length,
          status: job.exitCode === null ? "running" : "exited",
        }) + "\n",
      )
      break
    }

    case "job.kill": {
      const { jobId, signal = "SIGTERM" } = req
      const job = bgJobs.get(jobId)
      if (!job) {
        client.write(JSON.stringify({ error: "Job not found" }) + "\n")
        return
      }
      job.child.kill(signal)
      client.write(JSON.stringify({ ok: true, jobId }) + "\n")
      break
    }

    case "browser": {
      const { action } = req
      client.write(JSON.stringify({ ok: true, action: action || "ready", message: "browser session ready" }) + "\n")
      break
    }

    default:
      client.write(JSON.stringify({ error: `unknown op: ${op}` }) + "\n")
  }
}

if (process.argv[1]?.endsWith("agentd.ts") || process.argv[1]?.endsWith("agentd.js")) {
  startAgentd()
}
