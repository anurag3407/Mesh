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
        <p className="font-mono text-[12px] text-danger">something went wrong</p>
        <h1 className="mt-2 text-lg font-medium">This page could not load</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Check your connection and try again. If it keeps happening, give your administrator this
          reference{error.digest ? `: ${error.digest}` : "."}
        </p>
        <Button className="mt-4" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  )
}
