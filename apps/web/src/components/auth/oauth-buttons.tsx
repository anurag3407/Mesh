"use client"

import { useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function OAuthButtons({
  next,
  googleEnabled,
  githubEnabled,
}: {
  next: string
  googleEnabled: boolean
  githubEnabled: boolean
}) {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!googleEnabled && !githubEnabled) return null

  async function start(provider: "google" | "github") {
    setPending(provider)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (oauthError) {
      setError(oauthError.message)
      setPending(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-[10px] text-faint">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="grid gap-2">
        {googleEnabled ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void start("google")}
            disabled={Boolean(pending)}
          >
            {pending === "google" ? "Opening Google…" : "Continue with Google"}
          </Button>
        ) : null}
        {githubEnabled ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-[12px]"
            onClick={() => void start("github")}
            disabled={Boolean(pending)}
          >
            {pending === "github" ? "Opening GitHub…" : "Continue with GitHub"}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-[12px] leading-relaxed text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
