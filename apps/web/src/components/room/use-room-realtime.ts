"use client"

import type { RealtimeChannel } from "@supabase/supabase-js"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  messageFromRow,
  sortMessages,
  sortToolCalls,
  toolCallFromRow,
  type PersonLookup,
  type RawMessageRow,
  type RawToolCallRow,
} from "@/lib/message-map"
import type {
  MessageView,
  RoomAgentView,
  MemberView,
  SessionView,
  ToolCallView,
  TurnStateView,
} from "@/lib/types"

type Connection = "connecting" | "connected" | "error" | "offline"

interface PresenceMeta {
  userId: string
  name: string
  typing: boolean
}

export interface PresencePerson {
  id: string
  name: string
  typing: boolean
}

function eventPayload<T>(payload: unknown): T {
  return payload as T
}

export function useRoomRealtime(args: {
  roomId: string
  user: { id: string; email: string | null }
  displayName: string
  initialMessages: MessageView[]
  initialToolCalls: ToolCallView[]
  initialSession: SessionView | null
  initialThreadCounts: Record<string, number>
  roomAgents: RoomAgentView[]
  members: MemberView[]
}) {
  const [messages, setMessages] = useState<MessageView[]>(() => sortMessages(args.initialMessages))
  const [toolCalls, setToolCalls] = useState<ToolCallView[]>(() =>
    sortToolCalls(args.initialToolCalls),
  )
  const [turnState, setTurnState] = useState<TurnStateView | null>(() =>
    args.initialSession
      ? {
          sessionId: args.initialSession.id,
          activeAgentId: null,
          queue: args.initialSession.queue.map((item) => item.agentId),
        }
      : null,
  )
  const [presence, setPresence] = useState<PresencePerson[]>([])
  const [threadCounts, setThreadCounts] = useState<Record<string, number>>(
    args.initialThreadCounts,
  )
  const [connection, setConnection] = useState<Connection>("connecting")

  const supabaseRef = useRef(createSupabaseBrowserClient())
  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingRef = useRef(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deltaSeq = useRef(new Map<string, number>())

  const lookup: PersonLookup = useMemo(
    () => ({
      agents: new Map(
        args.roomAgents.map(({ agent }) => [
          agent.id,
          { displayName: agent.displayName, handle: agent.handle },
        ]),
      ),
      members: new Map(
        args.members.map((member) => [
          member.userId,
          { displayName: member.displayName, avatarUrl: member.avatarUrl },
        ]),
      ),
    }),
    [args.roomAgents, args.members],
  )
  const lookupRef = useRef(lookup)
  lookupRef.current = lookup
  const userRef = useRef({ id: args.user.id, name: args.displayName })
  userRef.current = { id: args.user.id, name: args.displayName }
  const roomIdRef = useRef(args.roomId)
  roomIdRef.current = args.roomId

  const mergeMessage = useCallback((incoming: MessageView, authoritative = false) => {
    setMessages((prev) => {
      const index = prev.findIndex((message) => message.id === incoming.id)
      if (index === -1) return sortMessages([...prev, incoming])
      const current = prev[index]!
      let content = incoming.content
      if (!authoritative) {
        if (incoming.content.length < current.content.length && incoming.status === "streaming") {
          content = current.content
        }
      }
      const next = {
        ...current,
        ...incoming,
        content,
        metadata: { ...current.metadata, ...incoming.metadata },
      }
      const copy = [...prev]
      copy[index] = next
      return copy
    })
  }, [])

  const refreshMessage = useCallback(
    async (messageId: string) => {
      const supabase = supabaseRef.current
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .maybeSingle()
      if (data) mergeMessage(messageFromRow(data as RawMessageRow, lookupRef.current), true)
    },
    [mergeMessage],
  )

  const mergeToolCall = useCallback((incoming: ToolCallView) => {
    setToolCalls((prev) => {
      const index = prev.findIndex((call) => call.id === incoming.id)
      if (index === -1) return sortToolCalls([...prev, incoming])
      const copy = [...prev]
      copy[index] = { ...copy[index]!, ...incoming }
      return copy
    })
  }, [])

  const mergeHistory = useCallback(
    (rows: RawMessageRow[]) => {
      for (const row of rows) {
        const mapped = messageFromRow(row, lookupRef.current)
        mergeMessage(mapped, row.status !== "streaming")
      }
    },
    [mergeMessage],
  )

  useEffect(() => {
    const supabase = supabaseRef.current
    let disposed = false
    void supabase.auth.getSession().then(({ data }) => {
      if (disposed) return
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token)
      }
      const channel = supabase.channel(`room:${args.roomId}`, {
        config: {
          private: true,
          presence: { key: args.user.id },
        },
      })
      channelRef.current = channel

    const applyPresence = () => {
      const state = channel.presenceState<PresenceMeta>()
      const byId = new Map<string, PresencePerson>()
      for (const [key, entries] of Object.entries(state)) {
        for (const meta of entries) {
          const id = meta.userId || key
          const current = byId.get(id)
          byId.set(id, {
            id,
            name: meta.name || current?.name || "someone",
            typing: Boolean(meta.typing) || Boolean(current?.typing),
          })
        }
      }
      setPresence([...byId.values()])
    }

    channel
      .on("broadcast", { event: "message.delta" }, ({ payload }) => {
        const event = eventPayload<{ messageId: string; seq: number; delta: string }>(payload)
        const last = deltaSeq.current.get(event.messageId) ?? -1
        if (event.seq <= last) return
        deltaSeq.current.set(event.messageId, event.seq)
        setMessages((prev) => {
          const index = prev.findIndex((message) => message.id === event.messageId)
          if (index === -1) {
            return sortMessages([
              ...prev,
              {
                id: event.messageId,
                roomId: roomIdRef.current,
                threadRootId: null,
                senderType: "agent",
                senderId: null,
                content: event.delta,
                status: "streaming",
                mentions: [],
                runId: null,
                metadata: {},
                createdAt: new Date().toISOString(),
                senderName: "agent",
                senderHandle: null,
                senderAvatarUrl: null,
              },
            ])
          }
          const current = prev[index]!
          if (current.status !== "streaming") return prev
          const copy = [...prev]
          copy[index] = { ...current, content: current.content + event.delta }
          return copy
        })
      })
      .on("broadcast", { event: "message.done" }, ({ payload }) => {
        const event = eventPayload<{ messageId: string; status: MessageView["status"] }>(payload)
        setMessages((prev) => {
          const index = prev.findIndex((message) => message.id === event.messageId)
          if (index === -1) return prev
          const copy = [...prev]
          copy[index] = { ...copy[index]!, status: event.status }
          return copy
        })
        void refreshMessage(event.messageId)
      })
      .on("broadcast", { event: "turn.state" }, ({ payload }) => {
        const event = eventPayload<TurnStateView>(payload)
        if (event.threadRootId) return
        setTurnState(event)
      })
      .on("broadcast", { event: "tool.approval_requested" }, ({ payload }) => {
        const event = eventPayload<{
          toolCallId: string
          agentId: string
          toolName: string
          args: Record<string, unknown>
        }>(payload)
        setToolCalls((prev) => {
          if (prev.some((call) => call.id === event.toolCallId)) {
            return prev.map((call) =>
              call.id === event.toolCallId ? { ...call, status: "pending_approval" } : call,
            )
          }
          return sortToolCalls([
            ...prev,
            {
              id: event.toolCallId,
              runId: null,
              roomId: roomIdRef.current,
              messageId: null,
              toolName: event.toolName,
              args: event.args,
              result: null,
              status: "pending_approval",
              approvedBy: null,
              resolvedAt: null,
              error: null,
              createdAt: new Date().toISOString(),
            },
          ])
        })
      })
      .on("broadcast", { event: "tool.approval_resolved" }, ({ payload }) => {
        const event = eventPayload<{ toolCallId: string; status: "approved" | "rejected" }>(payload)
        setToolCalls((prev) =>
          prev.map((call) =>
            call.id === event.toolCallId ? { ...call, status: event.status } : call,
          ),
        )
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `room_id=eq.${args.roomId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string }
            if (old.id) setMessages((prev) => prev.filter((m) => m.id !== old.id))
            return
          }
          const row = payload.new as RawMessageRow
          mergeMessage(messageFromRow(row, lookupRef.current))
          if (payload.eventType === "INSERT" && row.thread_root_id) {
            setThreadCounts((prev) => ({
              ...prev,
              [row.thread_root_id as string]: (prev[row.thread_root_id as string] ?? 0) + 1,
            }))
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tool_calls", filter: `room_id=eq.${args.roomId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return
          mergeToolCall(toolCallFromRow(payload.new as RawToolCallRow))
        },
      )
      .on("presence", { event: "sync" }, applyPresence)
      .on("presence", { event: "join" }, applyPresence)
      .on("presence", { event: "leave" }, applyPresence)
      .subscribe(async (status) => {
        if (disposed) return
        if (status === "SUBSCRIBED") {
          setConnection(navigator.onLine ? "connected" : "offline")
          await channel.track({
            userId: userRef.current.id,
            name: userRef.current.name,
            typing: false,
          } satisfies PresenceMeta)
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnection("error")
        } else if (status === "CLOSED") {
          setConnection("error")
        }
      })

    })

    const onOffline = () => setConnection("offline")
    const onOnline = () => setConnection("connecting")
    window.addEventListener("offline", onOffline)
    window.addEventListener("online", onOnline)

    return () => {
      disposed = true
      window.removeEventListener("offline", onOffline)
      window.removeEventListener("online", onOnline)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      const active = channelRef.current
      channelRef.current = null
      if (active) void supabase.removeChannel(active)
    }
  }, [args.roomId, args.user.id, mergeMessage, mergeToolCall, refreshMessage])

  useEffect(() => {
    if (connection === "connected" || connection === "offline") return
    const timer = setInterval(async () => {
      const supabase = supabaseRef.current
      const [messagesResult, toolsResult] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .eq("room_id", roomIdRef.current)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("tool_calls")
          .select("*")
          .eq("room_id", roomIdRef.current)
          .order("created_at", { ascending: false })
          .limit(60),
      ])
      for (const row of (messagesResult.data ?? []) as RawMessageRow[]) {
        mergeMessage(messageFromRow(row, lookupRef.current), row.status !== "streaming")
      }
      for (const row of (toolsResult.data ?? []) as RawToolCallRow[]) {
        mergeToolCall(toolCallFromRow(row))
      }
    }, 4_000)
    return () => clearInterval(timer)
  }, [connection, mergeMessage, mergeToolCall])

  const trackTyping = useCallback(() => {
    const channel = channelRef.current
    if (!channel) return
    if (!typingRef.current) {
      typingRef.current = true
      void channel.track({
        userId: userRef.current.id,
        name: userRef.current.name,
        typing: true,
      } satisfies PresenceMeta)
    }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      typingRef.current = false
      void channel.track({
        userId: userRef.current.id,
        name: userRef.current.name,
        typing: false,
      } satisfies PresenceMeta)
    }, 2_500)
  }, [])

  return {
    messages,
    toolCalls,
    turnState,
    presence,
    threadCounts,
    connection,
    trackTyping,
    mergeHistory,
  }
}
