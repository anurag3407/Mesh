import { NextResponse } from "next/server"
import { getRoomAccess } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { insertHumanMessage } from "@/lib/message-send"
import { queueRoomMessage } from "@/lib/orchestrator"

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const input = body as {
    orgSlug?: unknown
    roomId?: unknown
    content?: unknown
    threadRootId?: unknown
    clientId?: unknown
  }
  if (
    typeof input.orgSlug !== "string" ||
    typeof input.roomId !== "string" ||
    typeof input.content !== "string"
  ) {
    return NextResponse.json({ error: "invalid fields" }, { status: 400 })
  }
  const access = await getRoomAccess(input.orgSlug, input.roomId)
  if (!access) return NextResponse.json({ error: "room not found" }, { status: 404 })
  const inserted = await insertHumanMessage({
    supabase,
    userId: user.id,
    roomId: input.roomId,
    content: input.content,
    threadRootId: typeof input.threadRootId === "string" ? input.threadRootId : null,
    clientId: typeof input.clientId === "string" ? input.clientId : null,
  })
  if (!inserted.ok) return NextResponse.json({ error: inserted.error }, { status: 400 })
  const queued = await queueRoomMessage(input.roomId, inserted.id)
  return NextResponse.json({
    messageId: inserted.id,
    queued: queued.ok,
    warning: queued.ok ? undefined : "Saved; the agent queue is unreachable.",
  })
}
