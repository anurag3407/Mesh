"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { retryMessageAction } from "@/lib/actions/messages"
import { Button } from "@/components/ui/button"
import { recoveryHint } from "@/lib/recovery-hint"

/** The way forward from a failed agent turn: send it again, or go to where it can be fixed. */
export function FailureActions({
  orgSlug,
  roomId,
  messageId,
  text,
  reason,
  canAdmin,
  showRetry,
}: {
  orgSlug: string
  roomId: string
  messageId: string
  text: string
  reason: string | null
  canAdmin: boolean
  showRetry: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const hint = canAdmin ? recoveryHint({ text, reason, orgSlug, roomId }) : null
  if (!showRetry && !hint) return null

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {showRetry ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              const result = await retryMessageAction({ orgSlug, roomId, messageId })
              if (!result.ok) setError(result.error ?? "Could not retry")
            })
          }}
        >
          {pending ? "Retrying…" : "Retry"}
        </Button>
      ) : null}
      {hint ? (
        <Link
          href={hint.href}
          className="font-mono text-[12px] text-accent underline underline-offset-4"
        >
          {hint.label}
        </Link>
      ) : null}
      {error ? (
        <span role="alert" className="text-[12px] text-danger">
          {error}
        </span>
      ) : null}
    </div>
  )
}
