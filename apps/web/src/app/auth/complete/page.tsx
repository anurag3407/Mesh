import type { Metadata } from "next"
import { PublicShell } from "@/components/public/public-shell"
import { CompleteAuth } from "@/components/auth/complete-auth"
import { safeNextPath } from "@/lib/safe-next"

export const metadata: Metadata = { title: "Signing in · Mesh" }

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const next = safeNextPath(params.next)
  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-md px-5 py-16 sm:px-8">
        <p className="font-mono text-[11px] text-faint">auth</p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-0.02em]">Finishing sign-in</h1>
        <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-muted">
          One moment while we open your workspace.
        </p>
        <div className="mt-6 rounded-md border border-line bg-panel p-5">
          <CompleteAuth next={next} />
        </div>
      </div>
    </PublicShell>
  )
}
