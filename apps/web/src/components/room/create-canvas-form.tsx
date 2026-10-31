"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createCanvas } from "@/lib/actions/canvas"
import { Button } from "@/components/ui/button"
import { Field, Input, Select } from "@/components/ui/field"
import { InlineAlert } from "@/components/ui/empty"
import type { ActionResult } from "@/lib/types"

export function CreateCanvasForm({
  orgSlug,
  roomId,
  onCreated,
}: {
  orgSlug: string
  roomId: string
  onCreated: (canvasId: string) => void
}) {
  const router = useRouter()
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createCanvas, null)

  useEffect(() => {
    const id = state?.data?.canvasId
    if (state?.ok && typeof id === "string") {
      onCreated(id)
      router.refresh()
    }
  }, [state, onCreated, router])

  return (
    <form action={action} className="space-y-3 border-t border-line bg-panel p-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="roomId" value={roomId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_150px_140px]">
        <Field label="title" htmlFor="canvas-title">
          <Input id="canvas-title" name="title" required maxLength={60} placeholder="launch notes" />
        </Field>
        <Field label="kind" htmlFor="canvas-kind">
          <Select id="canvas-kind" name="kind" defaultValue="markdown">
            <option value="markdown">markdown</option>
            <option value="code">code</option>
            <option value="html">html</option>
            <option value="svg">svg</option>
          </Select>
        </Field>
        <Field label="language" htmlFor="canvas-language" hint="code only">
          <Input id="canvas-language" name="language" placeholder="typescript" />
        </Field>
      </div>
      {state && !state.ok ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "adding…" : "add canvas"}
      </Button>
    </form>
  )
}
