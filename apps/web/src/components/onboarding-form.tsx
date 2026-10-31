"use client"

import { useActionState } from "react"
import { createOrg } from "@/lib/actions/orgs"
import { Button } from "@/components/ui/button"
import { Field, HelpText, Input } from "@/components/ui/field"
import { InlineAlert } from "@/components/ui/empty"
import type { ActionResult } from "@/lib/types"

export function OnboardingForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createOrg, null)
  return (
    <form action={action} className="mt-8 space-y-5">
      <Field label="workspace name" htmlFor="name" hint="visible to your team">
        <Input id="name" name="name" required minLength={2} maxLength={60} autoFocus placeholder="Acme Labs" />
      </Field>
      <Field label="url slug" htmlFor="slug" hint="optional">
        <Input id="slug" name="slug" pattern="[a-z0-9][a-z0-9-]{1,47}" placeholder="acme-labs" />
        <HelpText>Lowercase letters, numbers and hyphens. If left empty we derive it from the name.</HelpText>
      </Field>
      {state && !state.ok ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Creating workspace…" : "Create workspace"}
      </Button>
    </form>
  )
}
