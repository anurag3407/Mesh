"use client"

import { useActionState, useState } from "react"
import { sendMagicLink } from "@/lib/actions/auth"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/lib/types"

export function AuthForm({
  next,
  githubEnabled,
  initialError,
}: {
  next: string
  githubEnabled: boolean
  initialError: string | null
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    sendMagicLink,
    initialError ? { ok: false, error: initialError } : null,
  )
  const [githubPending, setGithubPending] = useState(false)
  const [githubError, setGithubError] = useState<string | null>(null)

  async function signInWithGithub() {
    setGithubPending(true)
    setGithubError(null)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setGithubError(error.message)
      setGithubPending(false)
    }
  }

  if (state?.ok) {
    return (
      <div className="w-full max-w-sm" aria-live="polite">
        <p className="font-mono text-[11px] text-accent">link sent</p>
        <h2 className="mt-3 text-2xl font-medium tracking-[-0.01em]">Check your inbox</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{state.message}</p>
        <p className="mt-6 text-[13px] leading-relaxed text-faint">
          The link opens this workspace on the same browser. Close the tab if you changed your mind.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-medium tracking-[-0.01em]">Sign in</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        We send a one-time link. There is no password to remember.
      </p>

      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="mb-2 block font-mono text-[11px] text-muted">
            email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className="h-11 w-full rounded-sm border border-line bg-panel px-3 text-sm text-text outline-none transition-colors focus:border-accent"
          />
        </div>
        {state && !state.ok ? (
          <p role="alert" className="text-[13px] text-danger">
            {state.error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          disabled={pending}
          className="w-full"
          size="lg"
        >
          {pending ? "Sending link…" : "Email me a sign-in link"}
        </Button>
      </form>

      {githubEnabled ? (
        <>
          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-[10px] text-faint">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={signInWithGithub}
            disabled={githubPending}
          >
            {githubPending ? "Opening GitHub…" : "Continue with GitHub"}
          </Button>
          {githubError ? (
            <p role="alert" className="mt-3 text-[13px] text-danger">
              {githubError}
            </p>
          ) : null}
        </>
      ) : null}

      <p className="mt-8 font-mono text-[11px] leading-relaxed text-faint">
        Access is limited to the organizations you belong to. Sessions use Supabase cookies.
      </p>
    </div>
  )
}
