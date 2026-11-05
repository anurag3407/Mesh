"use client"

import { useEffect, useRef, useState } from "react"
import { markRoomReadAction } from "@/lib/actions/room-state"
import { humanHandle } from "@/lib/human-handle"
import { desktopNotify, softBeep } from "@/lib/notify"
import { subscribeToPush } from "@/lib/push-client"
import { requestActivityRefresh } from "@/lib/use-workspace-change"
import { Button } from "@/components/ui/button"
import type { MessageView } from "@/lib/types"

export function RoomActivity({
  orgSlug,
  roomId,
  roomName,
  userId,
  userName,
  notifications,
  sound,
  messages,
}: {
  orgSlug: string
  roomId: string
  roomName: string
  userId: string
  userName: string
  notifications: "all" | "mentions" | "off"
  sound: boolean
  messages: MessageView[]
}) {
  const completed = messages.filter((message) => message.status === "complete")
  const lastCompletedId = useRef<string | null>(completed.at(-1)?.id ?? null)
  const lastBeep = useRef(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible")
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])

  const latestCompletedId = completed.at(-1)?.id ?? null

  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => {
      void markRoomReadAction(orgSlug, roomId).then(requestActivityRefresh)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [orgSlug, roomId, latestCompletedId, visible])

  useEffect(() => {
    const lastId = lastCompletedId.current
    const index = lastId ? completed.findIndex((message) => message.id === lastId) : -1
    const fresh = lastId && index === -1 ? completed.slice(-1) : completed.slice(index + 1)
    lastCompletedId.current = completed.at(-1)?.id ?? null
    if (!fresh.length) return
    if (notifications === "off") return
    const ownHandle = humanHandle(userName)
    const relevant = fresh.filter((message) => {
      if (message.senderId === userId) return false
      if (message.senderType === "system") return false
      if (notifications === "all") return true
      return message.mentions.map((mention) => mention.toLowerCase()).includes(ownHandle)
    })
    if (!relevant.length) return
    if (document.visibilityState === "hidden") {
      const last = relevant[relevant.length - 1]!
      void desktopNotify({
        title: roomName,
        body: `${last.senderName}: ${last.content.replace(/\s+/g, " ").slice(0, 140)}`,
        tag: `mesh-${roomId}`,
        url: `/${orgSlug}/r/${roomId}`,
      })
    } else if (sound && relevant.some((message) => message.senderType === "agent")) {
      const now = Date.now()
      if (now - lastBeep.current > 1_500) {
        lastBeep.current = now
        softBeep()
      }
    }
    // completed is derived from messages; the ref prevents replaying old items.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, notifications, sound, userId, userName, orgSlug, roomId, roomName])

  return null
}

export function EnableAlerts({ enabled }: { enabled: boolean }) {
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof Notification === "undefined") return
    setPermission(Notification.permission)
  }, [])

  if (!enabled || permission !== "default") return null

  return (
    <Button
      variant="quiet"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const next = await Notification.requestPermission()
          setPermission(next)
          if (next === "granted") await subscribeToPush()
        } finally {
          setBusy(false)
        }
      }}
      title="Get an alert when an agent needs a decision or someone mentions you"
    >
      {busy ? "…" : "Enable alerts"}
    </Button>
  )
}
