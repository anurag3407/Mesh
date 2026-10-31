"use client"

import { useActionState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { InlineAlert } from "@/components/ui/empty"
import { cn } from "@/lib/format"
import type { ActionResult } from "@/lib/types"

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "saving…",
  className,
  resetOnSuccess = false,
  footer,
  submitVariant = "primary",
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>
  children: React.ReactNode
  submitLabel: string
  pendingLabel?: string
  className?: string
  resetOnSuccess?: boolean
  footer?: React.ReactNode
  submitVariant?: "primary" | "secondary" | "outline" | "danger"
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null)
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset()
  }, [state, resetOnSuccess])

  return (
    <form ref={ref} action={formAction} className={cn("space-y-3", className)}>
      {children}
      {state && !state.ok ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      {state?.ok && state.message ? <InlineAlert tone="success">{state.message}</InlineAlert> : null}
      {state?.ok && state.warning ? <InlineAlert tone="warning">{state.warning}</InlineAlert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={submitVariant} size="sm" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  )
}
