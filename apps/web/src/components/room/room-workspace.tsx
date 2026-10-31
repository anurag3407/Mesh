"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Group, Panel, Separator } from "react-resizable-panels"
import { ChatPanel } from "@/components/room/chat-panel"
import { CanvasPanel } from "@/components/room/canvas-panel"
import { ThreadSheet } from "@/components/room/thread-sheet"
import { useRoomRealtime } from "@/components/room/use-room-realtime"
import { EnableAlerts, RoomActivity } from "@/components/room/room-activity"
import { RoomMeetingBar } from "@/components/room/room-meeting-bar"
import { AvatarStack, PresenceLine } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SlidersIcon } from "@/components/ui/icons"
import { cn } from "@/lib/format"
import type { RoomPageData } from "@/lib/types"

type View = "chat" | "canvas"

export function RoomWorkspace({
  data,
  initialCanvasId = null,
}: {
  data: RoomPageData
  initialCanvasId?: string | null
}) {
  const [isDesktop, setIsDesktop] = useState(false)
  const [view, setView] = useState<View>(initialCanvasId ? "canvas" : "chat")
  const [threadRootId, setThreadRootId] = useState<string | null>(null)

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)")
    const apply = () => setIsDesktop(query.matches)
    apply()
    query.addEventListener("change", apply)
    return () => query.removeEventListener("change", apply)
  }, [])

  const realtime = useRoomRealtime({
    roomId: data.room.id,
    user: { id: data.user.id, email: data.user.email },
    displayName: data.user.displayName,
    initialMessages: data.messages,
    initialToolCalls: data.toolCalls,
    initialSession: data.activeSession,
    initialThreadCounts: data.threadCounts,
    roomAgents: data.roomAgents,
    members: data.members,
  })

  const root = threadRootId
    ? realtime.messages.find((message) => message.id === threadRootId) ?? null
    : null

  const people = realtime.presence.length
    ? realtime.presence
    : [{ id: data.user.id, name: data.user.displayName, typing: false }]

  const roomPrefix = data.room.kind === "public" ? "#" : data.room.kind === "dm" ? "@" : "·"

  const chat = (
    <ChatPanel
      orgSlug={data.org.slug}
      roomId={data.room.id}
      roomName={data.room.name}
      roomKind={data.room.kind}
      user={{ id: data.user.id, displayName: data.user.displayName }}
      messages={realtime.messages}
      toolCalls={realtime.toolCalls}
      turnState={realtime.turnState}
      roomAgents={data.roomAgents}
      canAdmin={data.canAdmin}
      connection={realtime.connection}
      threadCounts={realtime.threadCounts}
      onOpenThread={(message) => setThreadRootId(message.id)}
      onTyping={realtime.trackTyping}
    />
  )

  const canvas = (
    <CanvasPanel
      canvases={data.canvases}
      orgSlug={data.org.slug}
      roomId={data.room.id}
      userName={data.user.displayName}
      initialCanvasId={initialCanvasId}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-ink px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span aria-hidden="true" className="font-mono text-[12px] text-faint">
              {roomPrefix}
            </span>
            <h1
              className="truncate text-[15px] font-medium tracking-[-0.01em]"
              data-testid="room-title"
            >
              {data.room.name}
            </h1>
            <span className="font-mono text-[10px] text-faint">
              {data.room.kind} · {data.room.turnMode} · cap {data.room.turnCap}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <AvatarStack people={people} />
            <PresenceLine people={people} selfId={data.user.id} />
            {realtime.connection === "connected" ? (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-faint">
                <span aria-hidden="true" className="h-1 w-1 bg-[var(--color-ok)]" />
                live
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EnableAlerts enabled={data.user.notifications !== "off"} />
          {data.canAdmin ? (
            <Link
              href={`/${data.org.slug}/r/${data.room.id}/settings`}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line px-2.5 font-mono text-[11px] text-muted hover:border-line-strong hover:text-text"
            >
              <SlidersIcon width={13} height={13} />
              settings
            </Link>
          ) : null}
          <div className="flex items-center gap-1 md:hidden" role="group" aria-label="Room view">
            {(["chat", "canvas"] as const).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={view === item ? "secondary" : "ghost"}
                onClick={() => setView(item)}
                aria-pressed={view === item}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <RoomMeetingBar
        orgSlug={data.org.slug}
        meeting={data.meeting}
        schedule={data.roomSchedule}
      />

      <RoomActivity
        orgSlug={data.org.slug}
        roomId={data.room.id}
        roomName={data.room.name}
        userId={data.user.id}
        userName={data.user.displayName}
        notifications={data.user.notifications}
        sound={data.user.sound}
        messages={realtime.messages}
      />

      {isDesktop ? (
        <Group orientation="horizontal" id="room-split" className="min-h-0 flex-1">
          <Panel defaultSize="57%" minSize="380px" className="min-h-0 overflow-hidden">
            {chat}
          </Panel>
          <Separator className="w-px bg-line hover:bg-line-strong" />
          <Panel defaultSize="43%" minSize="300px" className="min-h-0 overflow-hidden">
            {canvas}
          </Panel>
        </Group>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className={cn("min-h-0 flex-1", view !== "chat" && "hidden")}>{chat}</div>
          {view === "canvas" ? <div className="min-h-0 flex-1">{canvas}</div> : null}
        </div>
      )}

      <ThreadSheet
        root={root}
        messages={realtime.messages}
        toolCalls={realtime.toolCalls}
        orgSlug={data.org.slug}
        roomId={data.room.id}
        roomName={data.room.name}
        roomAgents={data.roomAgents}
        canAdmin={data.canAdmin}
        mergeHistory={realtime.mergeHistory}
        onTyping={realtime.trackTyping}
        onClose={() => setThreadRootId(null)}
      />
    </div>
  )
}
