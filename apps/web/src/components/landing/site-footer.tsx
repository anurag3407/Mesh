import Link from "next/link"
import { SayabotMark } from "./sayabot-mark"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#crew", label: "The crew" },
      { href: "/#how", label: "How it works" },
      { href: "/#platform", label: "Platform" },
      { href: "/#security", label: "Security" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/help", label: "Docs & help" },
      { href: "/security", label: "Security model" },
      { href: "/signup", label: "Create a workspace" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
]

/** Link columns and the legal line, shared by every public page. */
export function SiteFooterLinks() {
  return (
    <div className="l-container">
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 border-t border-line pt-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-2 max-w-xs space-y-4 md:col-span-1">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Sayabot home">
            <SayabotMark className="h-7 w-7" />
            <span className="text-[17px] font-semibold tracking-[-0.03em]">sayabot</span>
          </Link>
          <p className="text-[14px] leading-relaxed text-muted">
            Shared rooms where people and AI agents take turns, edit one canvas and ask before
            they act.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">{col.title}</p>
            <ul className="mt-5 space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="l-navlink text-[14px]">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 py-10 font-mono text-[12px] text-faint">
        <span>© {new Date().getFullYear()} Sayabot. Self-hostable.</span>
        <span className="flex items-center gap-2">
          {(["ada", "pixel", "bolt", "sage"] as const).map((id) => (
            <span key={id} className="l-dot" style={{ ["--agent" as string]: `var(--color-${id})` }} />
          ))}
          <span className="ml-1">four agents, zero crosstalk</span>
        </span>
      </div>
    </div>
  )
}
