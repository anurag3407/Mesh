import { canvases } from "@sayabot/db"
import { Hocuspocus } from "@hocuspocus/server"
import { createClient } from "@supabase/supabase-js"
import { eq } from "drizzle-orm"
import * as Y from "yjs"
import { canUserReadRoom } from "../authz"
import { getDb } from "../db"
import { getEnv } from "../env"

export interface CollabContext {
  userId?: string | null
  canvasId?: string
  roomId?: string
  agentId?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let instance: Hocuspocus<CollabContext> | null = null

export async function loadCanvas(canvasId: string) {
  if (!UUID_RE.test(canvasId)) return null
  const [canvas] = await getDb()
    .select()
    .from(canvases)
    .where(eq(canvases.id, canvasId))
    .limit(1)
  return canvas ?? null
}

export function createHocuspocus(): Hocuspocus<CollabContext> {
  if (instance) return instance
  const env = getEnv()
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  instance = new Hocuspocus<CollabContext>({
    debounce: 2_000,
    maxDebounce: 10_000,
    quiet: true,
    async onAuthenticate({ token, documentName }) {
      if (!token) throw new Error("Missing Supabase token")
      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data.user) throw new Error("Invalid Supabase token")
      const canvas = await loadCanvas(documentName)
      if (!canvas) throw new Error("Canvas not found")
      if (!(await canUserReadRoom(data.user.id, canvas.roomId))) throw new Error("Forbidden")
      return { userId: data.user.id, canvasId: canvas.id, roomId: canvas.roomId }
    },
    async onLoadDocument({ document, documentName }) {
      const canvas = await loadCanvas(documentName)
      if (!canvas) throw new Error("Canvas not found")
      if (canvas.ydocState && canvas.ydocState.length > 0) {
        Y.applyUpdate(document, new Uint8Array(canvas.ydocState))
      } else if (canvas.snapshotText) {
        document.getText("content").insert(0, canvas.snapshotText)
      }
      return document
    },
    async onStoreDocument({ document, documentName }) {
      if (!UUID_RE.test(documentName)) return
      await persistCanvasState(documentName, document)
    },
  })
  return instance
}

export function getHocuspocus(): Hocuspocus<CollabContext> {
  if (!instance) throw new Error("Canvas server is not initialised")
  return instance
}

export async function persistCanvasState(canvasId: string, document: Y.Doc, text?: string): Promise<string> {
  const snapshotText = text ?? document.getText("content").toString()
  await getDb()
    .update(canvases)
    .set({
      ydocState: Buffer.from(Y.encodeStateAsUpdate(document)),
      snapshotText,
      updatedAt: new Date(),
    })
    .where(eq(canvases.id, canvasId))
  return snapshotText
}

export async function destroyHocuspocus(): Promise<void> {
  if (!instance) return
  await instance.flushPendingStores()
  instance.closeConnections()
  instance = null
}
