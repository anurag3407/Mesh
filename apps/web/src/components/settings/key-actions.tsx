"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteProviderKey, testProviderKey } from "@/lib/actions/keys"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/field"
import type { ActionResult } from "@/lib/types"

export function TestKeyButton({
  orgSlug,
  keyId,
  provider,
}: {
  orgSlug: string
  keyId: string
  provider: string
}) {
  const [model, setModel] = useState("")
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)

  function test() {
    setResult(null)
    startTransition(async () => {
      const response = await testProviderKey(orgSlug, keyId, model || undefined)
      setResult(response)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {provider === "openai-compatible" ? (
        <Input
          value={model}
          onChange={(event) => setModel(event.target.value)}
          placeholder="model to test"
          className="h-7 w-44 text-[12px]"
          aria-label="Model to test"
        />
      ) : null}
      <Button size="sm" variant="outline" className="h-7" disabled={pending} onClick={test}>
        {pending ? "testing…" : "test"}
      </Button>
      {result ? (
        <span
          role="status"
          className={result.ok ? "max-w-xs text-[11px] text-ok" : "max-w-xs text-[11px] text-danger"}
        >
          {result.ok ? result.message : result.error}
        </span>
      ) : null}
    </div>
  )
}

export function DeleteKeyButton({ orgSlug, keyId }: { orgSlug: string; keyId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function remove() {
    setError(null)
    startTransition(async () => {
      const result = await deleteProviderKey({ orgSlug, keyId })
      if (!result.ok) {
        setError(result.error ?? "Could not delete the key")
        setConfirming(false)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {confirming ? (
        <>
          <Button size="sm" variant="danger" className="h-7" disabled={pending} onClick={remove}>
            {pending ? "deleting…" : "confirm delete"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            cancel
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-danger"
          onClick={() => setConfirming(true)}
        >
          delete
        </Button>
      )}
      {error ? (
        <span role="alert" className="text-[11px] text-danger">
          {error}
        </span>
      ) : null}
    </div>
  )
}
