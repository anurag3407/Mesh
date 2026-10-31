"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { signOutAction } from "@/lib/actions/auth"
import { cn } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  AgentsIcon,
  AnalyticsIcon,
  CloseIcon,
  LogoutIcon,
  MenuIcon,
  PlusIcon,
  RoomsIcon,
  SlidersIcon,
} from "@/components/ui/icons"
import type { OrgRole, OrgSummary } from "@/lib/types"

interface RoomLink {
  id: string
  name: string
  kind: "public" | "private" | "dm"
  turnMode: string
}

function roomPrefix(kind: RoomLink["kind"]) {
  if (kind === "public") return "#"
  if (kind === "dm") return "@"
  return "·"
}

function SidebarContent({
  org,
  orgs,
  rooms,
  user,
  role,
  pathname,
  onNavigate,
}: {
  org: { slug: string; name: string }
  orgs: OrgSummary[]
  rooms: RoomLink[]
  user: { displayName: string; email: string | null }
  role: OrgRole
  pathname: string
  onNavigate?: () => void
}) {
  const grouped = {
    public: rooms.filter((r) => r.kind === "public"),
    private: rooms.filter((r) => r.kind === "private"),
    dm: rooms.filter((r) => r.kind === "dm"),
  }
  const groups: { key: keyof typeof grouped; label: string; prefix: string }[] = [
    { key: "public", label: "public", prefix: "#" },
    { key: "private", label: "private", prefix: "·" },
    { key: "dm", label: "direct", prefix: "@" },
  ]
  const nav = [
    { href: `/${org.slug}`, label: "rooms", icon: RoomsIcon, match: `/${org.slug}` },
    { href: `/${org.slug}/agents`, label: "agents", icon: AgentsIcon, match: `/${org.slug}/agents` },
    {
      href: `/${org.slug}/analytics`,
      label: "analytics",
      icon: AnalyticsIcon,
      match: `/${org.slug}/analytics`,
    },
  ]
  const settingsLinks = [
    { href: `/${org.slug}/settings/keys`, label: "provider keys" },
    { href: `/${org.slug}/settings/tools`, label: "tools & MCP" },
    { href: `/${org.slug}/settings/bots`, label: "bots" },
    { href: `/${org.slug}/settings/pricing`, label: "pricing" },
    { href: `/${org.slug}/admin`, label: "members & audit" },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
        <span className="grid h-6 w-6 place-items-center bg-accent font-mono text-[13px] font-medium text-void">
          m
        </span>
        <span className="font-mono text-sm text-text">mesh</span>
        <span className="ml-auto font-mono text-[10px] text-faint">/{org.slug}</span>
      </div>

      <details className="group border-b border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 hover:bg-raised">
          <span className="truncate text-[13px] font-medium">{org.name}</span>
          <span className="font-mono text-[10px] text-faint">{orgs.length} orgs</span>
        </summary>
        <div className="border-t border-line bg-panel py-1">
          {orgs.map((item) => (
            <Link
              key={item.id}
              href={`/${item.slug}`}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between px-4 py-1.5 text-[12px] hover:bg-raised",
                item.slug === org.slug ? "text-accent" : "text-muted",
              )}
            >
              <span className="truncate">{item.name}</span>
              <span className="font-mono text-[10px] text-faint">{item.role}</span>
            </Link>
          ))}
        </div>
      </details>

      <nav className="border-b border-line px-2 py-2" aria-label="Workspace">
        {nav.map((item) => {
          const active = item.match === `/${org.slug}`
            ? pathname === item.match
            : pathname.startsWith(item.match)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px]",
                active ? "bg-raised text-text" : "text-muted hover:bg-raised hover:text-text",
              )}
            >
              <item.icon width={16} height={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="font-mono text-[10px] text-faint">rooms</span>
          <Link
            href={`/${org.slug}#new-room`}
            onClick={onNavigate}
            className="grid h-6 w-6 place-items-center rounded-sm text-faint hover:bg-raised hover:text-text"
            aria-label="Create a room"
            title="Create a room"
          >
            <PlusIcon width={14} height={14} />
          </Link>
        </div>
        {rooms.length === 0 ? (
          <p className="px-2 py-2 text-[12px] leading-relaxed text-faint">
            No rooms yet. Create one and invite the agents you want in the room.
          </p>
        ) : null}
        {groups.map((group) => {
          const items = grouped[group.key]
          if (!items.length) return null
          return (
            <div key={group.key} className="mb-3">
              <p className="px-2 pb-1 font-mono text-[10px] text-faint">{group.label}</p>
              <ul>
                {items.map((room) => {
                  const href = `/${org.slug}/r/${room.id}`
                  const active = pathname.startsWith(href)
                  return (
                    <li key={room.id}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        data-testid="room-link"
                        data-room-name={room.name}
                        className={cn(
                          "group flex items-baseline gap-2 rounded-sm px-2 py-1.5",
                          active ? "bg-raised" : "hover:bg-raised",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "font-mono text-[11px]",
                            active ? "text-accent" : "text-faint",
                          )}
                        >
                          {roomPrefix(room.kind)}
                        </span>
                        <span
                          className={cn(
                            "truncate text-[13px]",
                            active ? "text-text" : "text-muted group-hover:text-text",
                          )}
                        >
                          {room.name}
                        </span>
                        {room.turnMode !== "mentions" ? (
                          <span className="ml-auto font-mono text-[9px] text-faint">
                            {room.turnMode}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      {role === "owner" || role === "admin" ? (
      <div className="border-t border-line px-2 py-2">
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] text-muted hover:bg-raised hover:text-text">
            <SlidersIcon width={16} height={16} />
            settings
          </summary>
          <div className="mt-1 border-l border-line pl-4">
            {settingsLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={cn(
                  "block py-1 text-[12px] hover:text-text",
                  pathname.startsWith(link.href) ? "text-text" : "text-muted",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </details>
      </div>
      ) : null}

      <div className="flex items-center gap-2 border-t border-line px-3 py-3">
        <Avatar name={user.displayName} kind="human" size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] leading-tight text-text">{user.displayName}</p>
          <p className="truncate font-mono text-[10px] leading-tight text-faint">
            {user.email ?? role}
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="quiet" size="icon-sm" aria-label="Sign out" title="Sign out">
            <LogoutIcon width={15} height={15} />
          </Button>
        </form>
      </div>
    </div>
  )
}

export function WorkspaceShell({
  org,
  orgs,
  rooms,
  user,
  role,
  children,
}: {
  org: { slug: string; name: string }
  orgs: OrgSummary[]
  rooms: RoomLink[]
  user: { displayName: string; email: string | null }
  role: OrgRole
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
    dialogRef.current?.close()
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [mobileOpen])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-void md:flex-row">
      <aside className="hidden w-[264px] shrink-0 border-r border-line md:block">
        <SidebarContent
          org={org}
          orgs={orgs}
          rooms={rooms}
          user={user}
          role={role}
          pathname={pathname}
        />
      </aside>

      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-ink px-3 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open workspace menu"
        >
          <MenuIcon />
        </Button>
        <span className="grid h-5 w-5 place-items-center bg-accent font-mono text-[11px] font-medium text-void">
          m
        </span>
        <span className="truncate text-[13px] text-text">{org.name}</span>
      </div>

      <main className="min-h-0 min-w-0 flex-1">{children}</main>

      <dialog
        ref={dialogRef}
        className="m-0 h-dvh max-h-none w-[86vw] max-w-[320px] bg-ink p-0 text-text backdrop:bg-void/70"
        onClose={() => setMobileOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setMobileOpen(false)
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="font-mono text-[11px] text-faint">workspace</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Close workspace menu"
            >
              <CloseIcon width={15} height={15} />
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <SidebarContent
              org={org}
              orgs={orgs}
              rooms={rooms}
              user={user}
              role={role}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      </dialog>
    </div>
  )
}
