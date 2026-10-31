import type { Metadata } from "next"
import Link from "next/link"
import { requireOrgAccess } from "@/lib/auth"
import { ProfileForm } from "@/components/settings/profile-form"

export const metadata: Metadata = { title: "Your profile" }

export default async function AccountPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <p className="font-mono text-[11px] text-faint">
          <Link href={`/${orgSlug}`} className="hover:text-text">
            chats
          </Link>{" "}
          / profile
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-[-0.02em]">Your profile</h1>
        <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-muted">
          How you appear in rooms, to agents and in mentions, plus the alerts this browser may
          show. Your email and password are managed by the sign-in provider.
        </p>
        <div className="mt-7 border-t border-line pt-6">
          <ProfileForm
            email={access.user.email}
            displayName={access.user.displayName}
            avatarUrl={access.user.avatarUrl}
            notifications={access.user.notifications}
            sound={access.user.sound}
          />
        </div>
        <p className="mt-8 font-mono text-[10px] leading-relaxed text-faint">
          Changing your display name changes your generated @handle for future mentions. Existing
          messages keep the name they were sent with.
        </p>
      </div>
    </div>
  )
}
