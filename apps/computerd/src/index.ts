import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { ComputerLifecycle } from "./lifecycle"

const app = new Hono()
const lifecycle = new ComputerLifecycle()

const INTERNAL_SECRET = process.env.ORCHESTRATOR_INTERNAL_SECRET || ""

function checkAuth(c: any): boolean {
  if (!INTERNAL_SECRET) return true
  const secretHeader = c.req.header("x-internal-secret")
  const authHeader = c.req.header("authorization")
  const provided = secretHeader ?? (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined)
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(INTERNAL_SECRET)
  return a.length === b.length && timingSafeEqual(a, b)
}

app.use("*", async (c, next) => {
  if (c.req.path === "/health") return next()
  if (!checkAuth(c)) {
    return c.json({ error: "unauthorized" }, 401)
  }
  await next()
})

app.get("/health", (c) => {
  return c.json({ ok: true, service: "computerd", port: 4100 })
})

app.post("/v1/computers/:agentId/ensure", async (c) => {
  const agentId = c.req.param("agentId")
  const body = await c.req.json().catch(() => ({}))
  const orgId = body.orgId || "default"
  const profile = body.profile === "browser" ? "browser" : "standard"

  const result = await lifecycle.ensure(agentId, orgId, profile)
  return c.json(result)
})

app.post("/v1/computers/:agentId/exec", async (c) => {
  const agentId = c.req.param("agentId")
  const body = await c.req.json()

  const frames = await lifecycle.execAgentd(agentId, {
    op: "exec",
    cmd: body.cmd,
    cwd: body.cwd,
    timeoutMs: body.timeoutMs,
  })

  // Return NDJSON
  const ndjson = frames.map((f: any) => JSON.stringify(f)).join("\n") + "\n"
  return new Response(ndjson, {
    headers: { "content-type": "application/x-ndjson" },
  })
})

app.post("/v1/computers/:agentId/files/read", async (c) => {
  const agentId = c.req.param("agentId")
  const body = await c.req.json()
  const frames = await lifecycle.execAgentd(agentId, { op: "read", ...body })
  return c.json(frames[0] ?? {})
})

app.post("/v1/computers/:agentId/files/write", async (c) => {
  const agentId = c.req.param("agentId")
  const body = await c.req.json()
  const frames = await lifecycle.execAgentd(agentId, { op: "write", ...body })
  return c.json(frames[0] ?? {})
})

app.post("/v1/computers/:agentId/files/list", async (c) => {
  const agentId = c.req.param("agentId")
  const body = await c.req.json().catch(() => ({}))
  const frames = await lifecycle.execAgentd(agentId, { op: "list", ...body })
  return c.json(frames[0] ?? { entries: [] })
})

app.post("/v1/computers/:agentId/browser", async (c) => {
  const agentId = c.req.param("agentId")
  const body = await c.req.json()
  const frames = await lifecycle.execAgentd(agentId, { op: "browser", ...body })
  return c.json(frames[0] ?? { ok: true })
})

app.post("/v1/computers/:agentId/stop", async (c) => {
  const agentId = c.req.param("agentId")
  await lifecycle.stop(agentId)
  return c.json({ ok: true })
})

app.delete("/v1/computers/:agentId", async (c) => {
  const agentId = c.req.param("agentId")
  const body = await c.req.json().catch(() => ({}))
  await lifecycle.remove(agentId, body.deleteDisk === true)
  return c.json({ ok: true })
})

const port = Number(process.env.PORT || 4100)
console.log(`[computerd] starting on port ${port}...`)
serve({ fetch: app.fetch, port })
