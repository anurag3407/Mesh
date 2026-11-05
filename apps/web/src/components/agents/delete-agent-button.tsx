"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { deleteAgentAction } from "@/lib/actions/agents"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { showToast } from "@/components/ui/toast"

export function DeleteAgentButton({
  orgSlug,
  agentId,
  handle,
}: {
  orgSlug: string
  agentId: string
  handle: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <ConfirmButton
        label="Delete agent"
        confirmLabel={`Delete @${handle}`}
        pendingLabel="Deleting…"
        warning="This removes it from every room and deletes direct chats with it. Its messages in rooms stay."
        variant="ghost"
        pending={pending}
        onConfirm={() => {
          setError(null)
          startTransition(async () => {
            const result = await deleteAgentAction({ orgSlug, agentId })
            if (!result.ok) {
              setError(result.error ?? "Could not delete the agent")
              return
            }
            showToast({ message: `@${handle} deleted`, tone: "success" })
            router.refresh()
          })
        }}
      />
      {error ? (
        <span role="alert" className="text-[12px] text-danger">
          {error}
        </span>
      ) : null}
    </span>
  )
}
