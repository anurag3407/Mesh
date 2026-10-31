"use client"

import { Button } from "@/components/ui/button"

export default function OrgError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="grid h-full place-items-center px-6">
      <div className="max-w-md border-l-2 border-[var(--color-danger)] pl-4">
        <p className="font-mono text-[11px] text-danger">workspace error</p>
        <h1 className="mt-2 text-lg font-medium">This view could not load</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {error.message || "The request failed."} Check that the Supabase project and orchestrator
          are reachable, then retry.
        </p>
        <Button className="mt-4" onClick={reset}>
          Retry
        </Button>
      </div>
    </div>
  )
}
