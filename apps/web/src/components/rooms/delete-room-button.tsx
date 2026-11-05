"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteRoomAction } from "@/lib/actions/rooms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/field"
import { showToast } from "@/components/ui/toast"

/** Deleting a room erases its history, so the name has to be typed to confirm. */
export function DeleteRoomButton({
  orgSlug,
  roomId,
  roomName,
}: {
  orgSlug: string
  roomId: string
  roomName: string
}) {
  const router = useRouter()
  const [typed, setTyped] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="space-y-2">
      <label htmlFor="confirm-room-name" className="block text-[12px] text-muted">
        Type <span className="font-mono text-text">{roomName}</span> to confirm
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="confirm-room-name"
          value={typed}
          autoComplete="off"
          onChange={(event) => setTyped(event.target.value)}
          className="max-w-xs"
        />
        <Button
          size="sm"
          variant="danger"
          disabled={pending || typed !== roomName}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              const result = await deleteRoomAction({ orgSlug, roomId })
              if (!result.ok) {
                setError(result.error ?? "Could not delete the room")
                return
              }
              showToast({ message: `${roomName} deleted`, tone: "success" })
              router.push(`/${orgSlug}`)
              router.refresh()
            })
          }}
        >
          {pending ? "Deleting…" : "Delete room"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
