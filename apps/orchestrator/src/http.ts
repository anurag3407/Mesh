import { redactSecrets } from "@mesh/core"
import { agents } from "@mesh/db"
import { generateText } from "ai"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import { z } from "zod"
import { abortRun, activeRunIds } from "./active-runs"
import { canUserReadRoom } from "./authz"
import { interruptRoom } from "./coordinator/interrupt"
import { botRoutes } from "./bot/routes"
import { loadCanvas } from "./canvas/server"
import { restoreCanvasSnapshot } from "./canvas/tools"
import { getDb, notify } from "./db"
import { isInternalRequest } from "./internal-auth"
import { enqueueRoomMessage } from "./jobs"
import { loadMessage } from "./runner/context"
import { resolveAgentModel } from "./runner/llm"

const roomMessageSchema = z.object({
  roomId: z.string().uuid(),
  messageId: z.string().uuid(),
})

const restoreSchema = z.object({
  userId: z.string().uuid(),
  snapshot: z.string().max(1_000_000),
})

const agentTestSchema = z.object({
  orgId: z.string().uuid(),
})

export function createApp() {
  const app = new Hono()

  app.use("/v1/*", bodyLimit({ maxSize: 2_000_000 }))
  app.use("/internal/*", bodyLimit({ maxSize: 200_000 }))

  app.get("/health", (c) =>
    c.json({ ok: true, service: "mesh-orchestrator", activeRuns: activeRunIds().length }),
  )

  app.use("/internal/*", async (c, next) => {
    if (!isInternalRequest(c.req.header("authorization"), c.req.header("x-internal-secret"))) {
      return c.json({ error: "unauthorized" }, 401)
    }
    await next()
  })

  app.post("/internal/room-message", async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = roomMessageSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "invalid body" }, 400)
    const message = await loadMessage(parsed.data.messageId)
    if (
      !message ||
      message.roomId !== parsed.data.roomId ||
      message.senderType !== "human"
    ) {
      return c.json({ error: "message not found or not a human message" }, 404)
    }
    await interruptRoom(parsed.data.roomId)
    await enqueueRoomMessage(parsed.data.roomId, parsed.data.messageId)
    return c.json({ queued: true }, 202)
  })

  app.post("/internal/runs/:runId/stop", async (c) => {
    const runId = c.req.param("runId")
    const stopped = abortRun(runId)
    await notify("mesh_stop_run", { runId }).catch(() => {})
    return c.json({ stopped, notified: true })
  })

  app.post("/internal/agents/:agentId/test", async (c) => {
    const agentId = c.req.param("agentId")
    const body = await c.req.json().catch(() => null)
    const parsed = agentTestSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "invalid body" }, 400)
    const [agent] = await getDb()
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.orgId, parsed.data.orgId)))
      .limit(1)
    if (!agent) return c.json({ error: "agent not found" }, 404)
    if (agent.kind === "external") return c.json({ error: "external agents have no model" }, 400)
    const started = Date.now()
    try {
      const resolved = await resolveAgentModel(agent)
      const result = await generateText({
        model: resolved.model,
        system: agent.systemPrompt || undefined,
        prompt: "Reply with the single word: ok",
        maxOutputTokens: 12,
        abortSignal: AbortSignal.timeout(25_000),
      })
      return c.json({
        text: redactSecrets(result.text).text.slice(0, 300),
        model: resolved.modelName,
        latencyMs: Date.now() - started,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return c.json({ error: redactSecrets(message).text.slice(0, 500) }, 502)
    }
  })

  app.post("/internal/canvases/:canvasId/restore", async (c) => {
    const canvasId = c.req.param("canvasId")
    const canvas = await loadCanvas(canvasId)
    if (!canvas) return c.json({ error: "canvas not found" }, 404)
    const body = await c.req.json().catch(() => null)
    const parsed = restoreSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "invalid body" }, 400)
    if (!(await canUserReadRoom(parsed.data.userId, canvas.roomId))) {
      return c.json({ error: "forbidden" }, 403)
    }
    const result = await restoreCanvasSnapshot({
      canvasId,
      roomId: canvas.roomId,
      userId: parsed.data.userId,
      snapshot: parsed.data.snapshot,
    })
    return c.json(result)
  })

  app.route("/", botRoutes)

  app.onError((error, c) => {
    console.error("[http] unhandled error", error)
    return c.json({ error: "internal error" }, 500)
  })

  return app
}

export function getDbForHealth() {
  return getDb()
}
