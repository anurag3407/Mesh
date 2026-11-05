import type { Metadata } from "next"
import Link from "next/link"
import { PublicShell } from "@/components/public/public-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = { title: "Reset your password · Mesh" }

export default function ForgotPasswordPage() {
  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-md px-5 py-16 sm:px-8">
        <p className="font-mono text-[12px] text-faint">account recovery</p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-0.02em]">Reset your password</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          We send a link to the address on the account. The link opens a page where you choose a new
          password.
        </p>
        <div className="mt-6 rounded-md border border-line bg-panel p-5">
          <ForgotPasswordForm />
        </div>
        <p className="mt-5 text-center font-mono text-[11px] text-faint">
          <Link href="/signup" className="underline underline-offset-2 hover:text-text">
            create an account instead
          </Link>
        </p>
      </div>
    </PublicShell>
  )
}
