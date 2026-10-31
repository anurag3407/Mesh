import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser, getProfile, listUserOrgs, requireUser } from "@/lib/auth"
import { OnboardingWizard } from "@/components/onboarding/wizard"

export const metadata: Metadata = { title: "Set up your room" }

const FALLBACK_ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
]

function timeZones(): string[] {
  try {
    const supported = Intl.supportedValuesOf("timeZone")
    if (supported.length > 0) {
      return supported.includes("UTC") ? supported : ["UTC", ...supported]
    }
  } catch {
    // Older runtimes without supportedValuesOf fall back to the short list.
  }
  return FALLBACK_ZONES
}

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding")
  const orgs = await listUserOrgs(user.id)
  if (orgs.length > 0) redirect(`/${orgs[0]!.slug}`)
  const current = await getCurrentUser()
  if (!current) redirect("/login")
  const profile = await getProfile(current)

  return (
    <OnboardingWizard
      userName={profile.displayName.split(" ")[0] ?? ""}
      defaultTimeZone="UTC"
      timeZones={timeZones()}
    />
  )
}
