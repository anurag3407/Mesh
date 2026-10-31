import { redirect } from "next/navigation"
import { getCurrentUser, listUserOrgs } from "@/lib/auth"

export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  const orgs = await listUserOrgs(user.id)
  if (orgs.length === 0) redirect("/onboarding")
  redirect(`/${orgs[0]!.slug}`)
}
