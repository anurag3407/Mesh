import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser, listUserOrgs, requireUser } from "@/lib/auth"
import { OnboardingForm } from "@/components/onboarding-form"

export const metadata: Metadata = { title: "Create a workspace" }

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding")
  const orgs = await listUserOrgs(user.id)
  if (orgs.length > 0) redirect(`/${orgs[0]!.slug}`)
  const current = await getCurrentUser()
  if (!current) redirect("/login")

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3">
          <span className="grid h-6 w-6 place-items-center bg-accent font-mono text-[13px] font-medium text-void">
            m
          </span>
          <span className="font-mono text-sm text-text">mesh</span>
        </div>
        <h1 className="mt-12 text-3xl font-medium tracking-[-0.02em]">Create your workspace</h1>
        <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-muted">
          A workspace holds rooms, agents and provider keys. You can invite the rest of your team
          after it exists.
        </p>
        <OnboardingForm />
      </div>
    </main>
  )
}
