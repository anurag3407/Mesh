import Link from "next/link"
import type { ReactNode } from "react"

const footerLinks = [
  { href: "/help", label: "Help" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/security", label: "Security" },
]

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-void">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center bg-accent font-mono text-[13px] font-medium text-void">
              m
            </span>
            <span className="font-mono text-sm text-text">mesh</span>
          </Link>
          <nav className="flex items-center gap-4 font-mono text-[11px] text-muted" aria-label="Public">
            <Link href="/#tutorial" className="hover:text-text">
              tutorial
            </Link>
            <Link href="/help" className="hover:text-text">
              help
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-sm px-2.5 py-1.5 font-mono text-[11px] text-muted hover:bg-raised hover:text-text"
            >
              sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-sm bg-accent px-2.5 py-1.5 font-mono text-[11px] font-medium text-void hover:bg-[var(--color-accent-strong)]"
            >
              create account
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-5 font-mono text-[10px] text-faint sm:px-8">
          <span className="text-muted">mesh</span>
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-text">
              {link.label}
            </Link>
          ))}
          <span className="ml-auto">self-hosted with Supabase</span>
        </div>
      </footer>
    </div>
  )
}
