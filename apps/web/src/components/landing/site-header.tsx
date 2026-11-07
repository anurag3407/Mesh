"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { SayabotMark } from "./sayabot-mark"

const NAV = [
  { href: "/#crew", label: "Crew" },
  { href: "/#how", label: "How it works" },
  { href: "/#platform", label: "Platform" },
  { href: "/#security", label: "Security" },
  { href: "/help", label: "Docs" },
]

export function SiteHeader() {
  const ref = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => el.toggleAttribute("data-scrolled", window.scrollY > 24)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <header ref={ref} className="l-header fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="l-header-bar mx-auto flex h-14 max-w-[1320px] items-center justify-between rounded-full pl-4 pr-2 sm:pl-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Sayabot home">
          <SayabotMark className="h-7 w-7" />
          <span className="text-[17px] font-semibold tracking-[-0.03em] text-text">sayabot</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 text-[14px] lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="l-navlink">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/login"
            className="hidden h-10 items-center rounded-full px-4 text-[14px] text-muted transition-colors hover:text-text sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-text px-4 text-[14px] font-medium text-void transition-colors hover:bg-accent"
          >
            Get started
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="mx-auto mt-2 max-w-[1320px] rounded-[28px] border border-line bg-ink/95 p-3 backdrop-blur-xl lg:hidden"
        >
          {[...NAV, { href: "/login", label: "Sign in" }].map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[17px] tracking-[-0.01em] text-text hover:bg-raised"
            >
              {item.label}
              <ArrowUpRight className="h-4 w-4 text-faint" />
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
