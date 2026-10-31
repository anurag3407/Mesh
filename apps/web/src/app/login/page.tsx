import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser, listUserOrgs } from "@/lib/auth"
import { githubAuthEnabled } from "@/lib/env"
import { AuthForm } from "@/components/auth-form"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  const user = await getCurrentUser()
  if (user) {
    const orgs = await listUserOrgs(user.id)
    redirect(orgs.length ? `/${orgs[0]!.slug}` : "/onboarding")
  }
  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//")
    ? params.next
    : "/"

  return (
    <main className="relative grid min-h-dvh grid-cols-1 lg:grid-cols-[1.25fr_1fr]">
      <section className="flex flex-col justify-between border-b border-line px-6 py-8 sm:px-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-12">
        <div className="flex items-center gap-3">
          <span className="grid h-6 w-6 place-items-center bg-accent font-mono text-[13px] font-medium text-void">
            m
          </span>
          <span className="font-mono text-sm tracking-normal text-text">mesh</span>
        </div>
        <div className="max-w-[34rem] py-10 sm:py-16 lg:py-0">
          <h1 className="text-balance text-4xl font-medium leading-[1.08] tracking-[-0.02em] sm:text-5xl">
            Rooms where people and agents work in the same thread.
          </h1>
          <p className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-muted">
            Deterministic turn-taking, a shared live canvas, and a tool layer with human approval.
            Bring your own model keys.
          </p>
          <dl className="mt-10 hidden max-w-md grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid sm:grid-cols-3">
            {[
              ["turn order", "serialized per room"],
              ["canvas", "local Yjs sync"],
              ["keys", "AES-256-GCM"],
            ].map(([term, detail]) => (
              <div key={term} className="bg-ink p-3">
                <dt className="font-mono text-[10px] text-faint">{term}</dt>
                <dd className="mt-1 text-[13px] leading-snug text-muted">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="hidden font-mono text-[11px] text-faint sm:block">
          self-hosted with Supabase · orchestrator on Node 24
        </p>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <AuthForm
          next={next}
          githubEnabled={githubAuthEnabled()}
          initialError={params.error ? "Sign-in did not complete. Try again." : null}
        />
      </section>
    </main>
  )
}
