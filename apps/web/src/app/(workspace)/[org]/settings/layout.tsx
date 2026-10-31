import Link from "next/link"
import { redirect } from "next/navigation"
import { isOrgAdmin, requireOrgAccess } from "@/lib/auth"
import { SettingsNav } from "@/components/settings/settings-nav"

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ org: string }>
}) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  if (!isOrgAdmin(access.role)) redirect(`/${orgSlug}`)
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <p className="font-mono text-[11px] text-faint">
          <Link href={`/${orgSlug}`} className="hover:text-text">
            workspace
          </Link>{" "}
          / settings
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-[-0.02em]">Settings</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
          Keys, tools, bot access and the prices used for budgets. Only organization admins can
          change these.
        </p>
        <div className="mt-6">
          <SettingsNav orgSlug={orgSlug} />
        </div>
        <div className="mt-6 space-y-8">{children}</div>
      </div>
    </div>
  )
}
