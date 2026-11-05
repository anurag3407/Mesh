"use client"

import { useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { MessageItem } from "@/components/room/message-item"
import { Composer } from "@/components/room/composer"
import { TurnStrip } from "@/components/room/turn-strip"
import { ToolCallsList } from "@/components/room/tool-call-card"
import { InlineAlert } from "@/components/ui/empty"
import { EmptyState } from "@/components/ui/empty"

import type {
  MessageView,
  RoomAgentView,
  ToolCallView,
  TurnStateView,
} from "@/lib/types"

function dayLabel(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "today"
  if (date.toDateString() === yesterday.toDateString()) return "yesterday"
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

export function ChatPanel({
  orgSlug,
  roomId,
  roomName,
  roomKind = "public",
  user,
  messages,
  toolCalls,
  turnState,
  roomAgents,
  canAdmin,
  memberAvatars,
  connection,
  threadCounts,
  onOpenThread,
  onTyping,
}: {
  orgSlug: string
  roomId: string
  roomName: string
  roomKind?: "public" | "private" | "dm"
  user: { id: string; displayName: string }
  messages: MessageView[]
  toolCalls: ToolCallView[]
  turnState: TurnStateView | null
  roomAgents: RoomAgentView[]
  canAdmin: boolean
  memberAvatars: Record<string, string>
  connection: "connecting" | "connected" | "error" | "offline"
  threadCounts: Record<string, number>
  onOpenThread: (message: MessageView) => void
  onTyping: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const mainMessages = useMemo(
    () => messages.filter((message) => message.threadRootId === null),
    [messages],
  )
  const streamingMessage = [...messages]
    .reverse()
    .find(
      (message) =>
        message.status === "streaming" &&
        message.senderType === "agent" &&
        message.threadRootId === null,
    )
  const orphanCalls = toolCalls.filter(
    (call) => !call.messageId || !messages.some((message) => message.id === call.messageId),
  )

  useEffect(() => {
    const element = scrollRef.current
    if (!element || !stickToBottom.current) return
    element.scrollTop = element.scrollHeight
  }, [messages])

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [])

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-void"
      aria-label={`Chat in ${roomName}`}
    >
      {connection === "error" ? (
        <div className="border-b border-line px-4 py-2">
          <InlineAlert tone="warning">
            Live updates are unavailable. The room is polling for new messages while it reconnects.
          </InlineAlert>
        </div>
      ) : null}
      {connection === "offline" ? (
        <div className="border-b border-line px-4 py-2">
          <InlineAlert tone="warning">
            You are offline. Messages you write queue in this browser.
          </InlineAlert>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget
          stickToBottom.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < 140
        }}
        className="min-h-0 flex-1 overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {mainMessages.length === 0 ? (
          <div className="px-6 py-10">
            <EmptyState
              title="This room is quiet"
              body={
                roomAgents.length
                  ? `Mention an agent with @handle to give it the floor. ${roomAgents
                      .map(({ agent }) => `@${agent.handle}`)
                      .join(", ")} are in the room.`
                  : "Add an agent to the room, then mention it with @handle to start a turn."
              }
              action={
                canAdmin ? (
                  <Link
                    href={`/${orgSlug}/r/${roomId}/settings`}
                    className="font-mono text-[11px] text-accent underline underline-offset-4"
                  >
                    room settings
                  </Link>
                ) : null
              }
            />
            <p className="mt-8 max-w-md font-mono text-[11px] leading-relaxed text-faint">
              Turn order is serialized per room. Multiple agents run one after another, never
              interleaved. The turn strip shows who has the floor.
            </p>
          </div>
        ) : (
          <div className="pb-4">
            {mainMessages.map((message, index) => {
              const previous = mainMessages[index - 1]
              const showDay = !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt)
              return (
                <div key={message.id}>
                  {showDay ? (
                    <div className="flex items-center gap-3 px-4 pb-1 pt-5" aria-hidden="true">
                      <span className="h-px flex-1 bg-line" />
                      <span className="font-mono text-[10px] text-faint">
                        {dayLabel(message.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-line" />
                    </div>
                  ) : null}
                  <MessageItem
                    message={message}
                    toolCalls={toolCalls}
                    orgSlug={orgSlug}
                    canAdmin={canAdmin}
                    threadReplyCount={threadCounts[message.id] ?? 0}
                    onOpenThread={onOpenThread}
                    avatarUrl={message.senderId ? memberAvatars[message.senderId] : null}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {orphanCalls.length ? (
        <div className="space-y-2 border-t border-line px-4 py-3">
          <ToolCallsList calls={orphanCalls.slice(-6)} orgSlug={orgSlug} canApprove={canAdmin} />
        </div>
      ) : null}

      <TurnStrip
        turnState={turnState}
        agents={roomAgents}
        streamingRunId={streamingMessage?.runId ?? null}
        orgSlug={orgSlug}
        roomId={roomId}
      />

      <div className="shrink-0 border-t border-line pb-[env(safe-area-inset-bottom)]">
        <Composer
          orgSlug={orgSlug}
          roomId={roomId}
          agents={roomAgents}
          placeholder={
            roomKind === "dm" ? `Message ${roomName}` : `Message #${roomName}`
          }
          onTyping={onTyping}
        />
      </div>
      <p className="sr-only">
        You are {user.displayName}. Agents in this room:{" "}
        {roomAgents.map(({ agent }) => `@${agent.handle}`).join(", ") || "none"}.
      </p>
    </section>
  )
}
