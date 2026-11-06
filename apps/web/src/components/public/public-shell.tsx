import Link from "next/link"
import type { ReactNode } from "react"
import { Sparkles, Heart } from "lucide-react"

const footerLinks = [
  { href: "/help", label: "Help" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/security", label: "Security" },
]

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-void text-text selection:bg-accent selection:text-void">
      {/* Top Floating Glow Header */}
      <header className="sticky top-0 z-50 border-b border-line/60 bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          {/* Brand Logo with Cute Bot Face */}
          <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-105">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-void shadow-md shadow-accent/20 transition-all group-hover:rotate-6">
              {/* Cute mini bot face with capsule eyes */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-void">
                {/* Antenna */}
                <circle cx="12" cy="2.5" r="1.5" />
                <line x1="12" y1="2.5" x2="12" y2="5" stroke="currentColor" strokeWidth="1.5" />
                {/* Head */}
                <rect x="3" y="5" width="18" height="15" rx="5" />
                {/* Dark Screen cutout */}
                <rect x="5.5" y="8" width="13" height="9" rx="3" fill="#ff9468" />
                {/* Left capsule eye */}
                <rect x="8" y="10" width="2" height="5" rx="1" fill="#070907" />
                {/* Right capsule eye */}
                <rect x="14" y="10" width="2" height="5" rx="1" fill="#070907" />
              </svg>
            </div>
            <span className="font-mono text-base font-bold tracking-tight text-text">mesh</span>
            <span className="hidden items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-mono text-accent sm:inline-flex">
              <Sparkles className="h-2.5 w-2.5" />
              ai teammates
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-6 font-mono text-[13px] text-muted md:flex" aria-label="Public">
            <Link href="/#playground" className="transition-colors hover:text-text">
              playground
            </Link>
            <Link href="/#teammates" className="transition-colors hover:text-text">
              bots
            </Link>
            <Link href="/#tour" className="transition-colors hover:text-text">
              tour
            </Link>
            <Link href="/help" className="transition-colors hover:text-text">
              help
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="rounded-full px-3.5 py-1.5 font-mono text-[12px] text-muted transition-colors hover:bg-raised hover:text-text"
            >
              sign in
            </Link>
            <Link
              href="/signup"
              className="group flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 font-mono text-[12px] font-semibold text-void shadow-md shadow-accent/20 transition-all hover:scale-105 hover:bg-accent-strong"
            >
              <span>create account</span>
              <span className="transition-transform group-hover:translate-x-0.5">✨</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Cute Footer */}
      <footer className="border-t border-line/70 bg-ink/40">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-y-4 px-5 py-8 sm:px-8">
          <div className="flex items-center gap-2 font-mono text-[12px] text-muted">
            <span className="font-bold text-text">mesh</span>
            <span className="text-faint">·</span>
            <span className="flex items-center gap-1 text-faint">
              a cozy shared room for humans & bots
              <Heart className="h-3 w-3 fill-rose-500 text-rose-500 inline" />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-mono text-[12px] text-muted">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-text">
                {link.label}
              </Link>
            ))}
            <span className="rounded-full border border-line bg-panel px-2.5 py-0.5 text-[11px] text-faint">
              self-hosted
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
