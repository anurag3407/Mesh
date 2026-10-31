"use client"

import Link from "next/link"
import { useActionState } from "react"
import { forgotPasswordAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/field"
import { InlineAlert } from "@/components/ui/empty"
import type { ActionResult } from "@/lib/types"

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    forgotPasswordAction,
    null,
  )
  return (
    <form action={action} className="space-y-4">
      <Field label="email" htmlFor="forgot-email">
        <Input
          id="forgot-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
        />
      </Field>
      {state && !state.ok ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      {state?.ok ? <InlineAlert tone="success">{state.message}</InlineAlert> : null}
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center font-mono text-[10px] text-faint">
        <Link href="/login" className="underline underline-offset-2 hover:text-text">
          back to sign in
        </Link>
      </p>
    </form>
  )
}
