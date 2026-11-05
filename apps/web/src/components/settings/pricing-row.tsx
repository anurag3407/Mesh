"use client"

import { useActionState } from "react"
import { upsertModelPricing } from "@/lib/actions/pricing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/field"
import { InlineAlert } from "@/components/ui/empty"
import type { ActionResult, PricingView } from "@/lib/types"

export function PricingRow({ orgSlug, price }: { orgSlug: string; price: PricingView }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    upsertModelPricing,
    null,
  )

  return (
    <form action={action} className="grid gap-2 py-3 sm:grid-cols-[1fr_110px_110px_auto]">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="provider" value={price.provider} />
      <input type="hidden" name="model" value={price.model} />
      <div className="min-w-0 self-center">
        <p className="truncate text-[13px] text-text">{price.model}</p>
        <p className="font-mono text-[11px] text-faint">{price.provider}</p>
      </div>
      <label className="sr-only" htmlFor={`in-${price.provider}-${price.model}`}>
        Input price per million tokens for {price.model}
      </label>
      <Input
        id={`in-${price.provider}-${price.model}`}
        name="inputPerMtok"
        type="number"
        step="0.000001"
        min="0"
        defaultValue={price.inputPerMtok}
        className="h-8 font-mono text-[12px]"
        aria-label="input USD per million tokens"
      />
      <label className="sr-only" htmlFor={`out-${price.provider}-${price.model}`}>
        Output price per million tokens for {price.model}
      </label>
      <Input
        id={`out-${price.provider}-${price.model}`}
        name="outputPerMtok"
        type="number"
        step="0.000001"
        min="0"
        defaultValue={price.outputPerMtok}
        className="h-8 font-mono text-[12px]"
        aria-label="output USD per million tokens"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="outline" className="h-8" disabled={pending}>
          {pending ? "saving" : "save"}
        </Button>
        {state && !state.ok ? (
          <span role="alert" className="text-[12px] text-danger">
            {state.error}
          </span>
        ) : null}
        {state?.ok ? <span className="text-[12px] text-ok">saved</span> : null}
      </div>
      {state && !state.ok ? (
        <div className="sm:col-span-4">
          <InlineAlert tone="danger">{state.error}</InlineAlert>
        </div>
      ) : null}
    </form>
  )
}
