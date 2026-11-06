"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { signOutAction } from "@/lib/actions/auth"
import { openBotDmAction } from "@/lib/actions/room-state"
import { cn } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SayabotMark } from "@/components/landing/mesh-mark"
import { useWorkspaceActivity } from "@/components/use-workspace-activity"
import {
  AgentsIcon,
  AnalyticsIcon,
  CanvasIcon,
  CheckIcon,
  CloseIcon,
  HistoryIcon,
  LogoutIcon,
  MenuIcon,
  PlusIcon,
  RoomsIcon,
  SendIcon,
  SlidersIcon,
} from "@/components/ui/icons"
import type { ChatListItem, OrgRole, OrgSummary } from "@/lib/types"

interface BotLink {
  id: string
  handle: string
  displayName: string
  kind: "llm" | "external"
}

const NAV = [
  { key: "chats", href: "", label: "Chats", icon: RoomsIcon },
  { key: "meetings", href: "/meetings", label: "Meetings", icon: HistoryIcon },
  { key: "tasks", href: "/tasks", label: "Tasks", icon: CheckIcon },
  { key: "files", href: "/files", label: "Files", icon: CanvasIcon },
] as const

function isChatMuted(item: ChatListItem): boolean {
  return Boolean(item.mutedUntil && new Date(item.mutedUntil).getTime() > Date.now())
}

/** Unread messages that should pull attention: muted and archived chats do not count. */
function attentionUnread(chats: ChatListItem[]): number {
  return chats.reduce(
    (total, chat) => total + (chat.archived || isChatMuted(chat) ? 0 : chat.unreadCount),
    0,
  )
}

function unreadLabel(item: ChatListItem): string | null {
  if (item.mentionCount > 0) return String(item.mentionCount)
  if (item.unreadCount > 0) return item.unreadCount > 9 ? "9+" : String(item.unreadCount)
  return null
}

function ChatRow({
  item,
  orgSlug,
  pathname,
  onNavigate,
}: {
  item: ChatListItem
  orgSlug: string
  pathname: string
  onNavigate?: () => void
}) {
  const href = `/${orgSlug}/r/${item.id}`
  const active = pathname.startsWith(href)
  const badge = item.mentionCount > 0 ? unreadLabel(item) : null
  const muted = isChatMuted(item)
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        data-testid="room-link"
        data-room-name={item.name}
        className={cn(
          "group flex items-center gap-2.5 rounded-sm px-2 py-2.5 md:py-1.5",
          active ? "bg-raised" : "hover:bg-raised",
        )}
      >
        <span
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-full border font-mono text-[11px]",
            item.isBotDm
              ? "border-[color-mix(in_srgb,var(--color-accent)_35%,transparent)] bg-accent-soft text-accent"
              : item.kind === "public"
                ? "border-line-strong text-muted"
                : "border-line text-faint",
          )}
        >
          {item.isBotDm ? "@" : item.kind === "public" ? "#" : "·"}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13px]",
            active ? "text-text" : "text-muted group-hover:text-text",
            item.pinned && !active ? "text-text" : null,
          )}
        >
          {item.name}
        </span>
        {badge ? (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[11px] font-medium text-void">
            {badge}
          </span>
        ) : item.unreadCount > 0 && !muted ? (
          <span
            className="h-1.5 w-1.5 rounded-full bg-accent"
            aria-label={`${item.unreadCount} unread`}
          />
        ) : null}
        {muted && !badge ? <span className="font-mono text-[11px] text-faint">muted</span> : null}
      </Link>
    </li>
  )
}

function BotRow({
  bot,
  orgSlug,
  onNavigate,
}: {
  bot: BotLink
  orgSlug: string
  onNavigate?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function start() {
    setError(null)
    startTransition(async () => {
      const result = await openBotDmAction(orgSlug, bot.id)
      if (!result.ok) {
        setError(result.error ?? "Could not open the bot chat")
        return
      }
      const path = typeof result.data?.path === "string" ? result.data.path : null
      if (path) {
        onNavigate?.()
        router.push(path)
        router.refresh()
      }
    })
  }

  return (
    <li>
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="group flex w-full items-center gap-2.5 rounded-sm px-2 py-2.5 text-left text-muted md:py-1.5 hover:bg-raised hover:text-text disabled:opacity-60"
        title={error ?? `Start a direct chat with ${bot.displayName}`}
      >
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] bg-accent-soft font-mono text-[11px] text-accent">
          @
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px]">{bot.displayName}</span>
        <span className="font-mono text-[11px] text-faint">
          {pending ? "…" : "chat"}
        </span>
      </button>
    </li>
  )
}

function SidebarContent({
  org,
  orgs,
  chats,
  bots,
  inboxCount,
  user,
  role,
  pathname,
  onNavigate,
}: {
  org: { slug: string; name: string }
  orgs: OrgSummary[]
  chats: ChatListItem[]
  bots: BotLink[]
  inboxCount: number
  user: { displayName: string; avatarUrl: string | null; email: string | null }
  role: OrgRole
  pathname: string
  onNavigate?: () => void
}) {
  const base = `/${org.slug}`
  const visible = chats.filter((chat) => !chat.archived)
  const pinned = visible.filter((chat) => chat.pinned)
  const pinIds = new Set(pinned.map((chat) => chat.id))
  const botChats = visible.filter((chat) => chat.isBotDm && !pinIds.has(chat.id))
  const rooms = visible.filter((chat) => !chat.isBotDm && !pinIds.has(chat.id))
  const dmByAgent = new Map(
    visible.filter((chat) => chat.isBotDm && chat.agentId).map((chat) => [chat.agentId!, chat.id]),
  )
  const active = (href: string) =>
    href === base ? pathname === base : pathname.startsWith(href)
  const settingsActive = pathname.startsWith(`${base}/settings`) || pathname.startsWith(`${base}/admin`)

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
        <SayabotMark className="h-6 w-6 shrink-0" />
        <span className="font-mono text-sm font-medium text-text">sayabot</span>
        <Link
          href={`${base}/search`}
          onClick={onNavigate}
          className="ml-auto grid h-10 w-10 place-items-center rounded-sm border border-line font-mono text-[13px] text-muted hover:border-line-strong hover:text-text md:h-7 md:w-7"
          aria-label="Search messages"
          title="Search messages (⌘K)"
        >
          <svg
            aria-hidden="true"
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </Link>
        <Link
          href={`${base}/chats/new`}
          onClick={onNavigate}
          className="grid h-10 w-10 place-items-center rounded-sm border border-line text-muted hover:border-line-strong hover:text-text md:h-7 md:w-7"
          aria-label="New chat"
          title="New chat"
        >
          <PlusIcon width={14} height={14} />
        </Link>
      </div>

      <details className="group border-b border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 hover:bg-raised">
          <span className="truncate text-[13px] font-medium">{org.name}</span>
          <span className="font-mono text-[11px] text-faint">switch</span>
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
              <span className="font-mono text-[11px] text-faint">{item.role}</span>
            </Link>
          ))}
          <Link
            href="/new-workspace"
            onClick={onNavigate}
            className="block border-t border-line px-4 py-2 text-[12px] text-muted hover:bg-raised hover:text-text"
          >
            + New workspace
          </Link>
        </div>
      </details>

      <nav className="border-b border-line px-2 py-2" aria-label="Workspace">
        {NAV.map((item) => {
          const href = `${base}${item.href}`
          const isActive =
            item.key === "chats"
              ? pathname === base ||
                pathname.startsWith(`${base}/r/`) ||
                pathname.startsWith(`${base}/chats`)
              : active(href)
          return (
            <Link
              key={item.key}
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-sm px-2 py-2.5 text-[13px] md:py-1.5",
                isActive ? "bg-raised text-text" : "text-muted hover:bg-raised hover:text-text",
              )}
            >
              <item.icon width={16} height={16} />
              {item.label}
              {item.key === "chats" && attentionUnread(chats) > 0 ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" aria-label="Unread chats" />
              ) : null}
            </Link>
          )
        })}
        <Link
          href={`${base}/inbox`}
          onClick={onNavigate}
          aria-current={active(`${base}/inbox`) ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-sm px-2 py-2.5 text-[13px] md:py-1.5",
            active(`${base}/inbox`)
              ? "bg-raised text-text"
              : "text-muted hover:bg-raised hover:text-text",
          )}
        >
          <SendIcon width={16} height={16} />
          Inbox
          {inboxCount > 0 ? (
            <span className="ml-auto grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[11px] font-medium text-void">
              {inboxCount > 99 ? "99+" : inboxCount}
            </span>
          ) : null}
        </Link>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {chats.length === 0 ? (
          <div className="px-2 py-2">
            <p className="text-[12px] leading-relaxed text-faint">
              No chats yet. Start a room, or open a direct chat with an agent.
            </p>
            <Link
              href={`${base}/chats/new`}
              onClick={onNavigate}
              className="mt-2 inline-block font-mono text-[12px] text-accent underline underline-offset-4"
            >
              new chat
            </Link>
          </div>
        ) : null}

        {pinned.length ? (
          <div className="mb-3">
            <p className="px-2 pb-1 font-mono text-[11px] text-faint">pinned</p>
            <ul>
              {pinned.map((item) => (
                <ChatRow
                  key={item.id}
                  item={item}
                  orgSlug={org.slug}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {botChats.length || bots.length ? (
          <div className="mb-3">
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="font-mono text-[11px] text-faint">agents</p>
              <Link
                href={`${base}/agents`}
                onClick={onNavigate}
                className="inline-flex min-h-8 items-center font-mono text-[11px] text-faint hover:text-text"
              >
                manage
              </Link>
            </div>
            <ul>
              {botChats.map((item) => (
                <ChatRow
                  key={item.id}
                  item={item}
                  orgSlug={org.slug}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
              {bots
                .filter((bot) => !dmByAgent.has(bot.id))
                .slice(0, 6)
                .map((bot) => (
                  <BotRow
                    key={bot.id}
                    bot={bot}
                    orgSlug={org.slug}
                    onNavigate={onNavigate}
                  />
                ))}
            </ul>
            {bots.filter((bot) => !dmByAgent.has(bot.id)).length > 6 ? (
              <Link
                href={`${base}/chats/new?tab=agent`}
                onClick={onNavigate}
                className="block px-2 py-1 font-mono text-[11px] text-faint hover:text-text"
              >
                all agents
              </Link>
            ) : null}
          </div>
        ) : null}

        <div>
          <div className="flex items-center justify-between px-2 pb-1">
            <p className="font-mono text-[11px] text-faint">rooms</p>
            <Link
              href={`${base}/chats/new`}
              onClick={onNavigate}
              className="grid h-10 w-10 place-items-center rounded-sm text-faint hover:bg-raised hover:text-text md:h-5 md:w-5"
              aria-label="New room"
              title="New room"
            >
              <PlusIcon width={12} height={12} />
            </Link>
          </div>
          {rooms.length === 0 && chats.length > 0 ? (
            <p className="px-2 py-1 text-[12px] text-faint">No group rooms yet.</p>
          ) : (
            <ul>
              {rooms.map((item) => (
                <ChatRow
                  key={item.id}
                  item={item}
                  orgSlug={org.slug}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <p className="px-2 pb-1 font-mono text-[11px] text-faint">workspace</p>
          <Link
            href={`${base}/agents`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-sm px-2 py-2.5 text-[12px] md:py-1.5",
              active(`${base}/agents`)
                ? "bg-raised text-text"
                : "text-muted hover:bg-raised hover:text-text",
            )}
          >
            <AgentsIcon width={15} height={15} />
            Agents
          </Link>
          <Link
            href={`${base}/analytics`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-sm px-2 py-2.5 text-[12px] md:py-1.5",
              active(`${base}/analytics`)
                ? "bg-raised text-text"
                : "text-muted hover:bg-raised hover:text-text",
            )}
          >
            <AnalyticsIcon width={15} height={15} />
            Usage
          </Link>
        </div>
      </div>

      {role === "owner" || role === "admin" ? (
        <div className="border-t border-line px-2 py-2">
          <details open={settingsActive || undefined}>
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm px-2 py-2.5 text-[12px] md:py-1.5 text-muted hover:bg-raised hover:text-text">
              <SlidersIcon width={15} height={15} />
              Settings
            </summary>
            <div className="mt-1 border-l border-line pl-4">
              {[
                { href: `${base}/settings/keys`, label: "Provider keys" },
                { href: `${base}/settings/tools`, label: "Tools & MCP" },
                { href: `${base}/settings/bots`, label: "External agents" },
                { href: `${base}/settings/pricing`, label: "Pricing" },
                { href: `${base}/admin`, label: "Workspace & members" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className={cn(
                    "block py-2.5 text-[12px] hover:text-text md:py-1",
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
        <Link
          href={`${base}/account`}
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-sm py-1 hover:bg-raised"
          title="Your profile"
        >
          <Avatar name={user.displayName} src={user.avatarUrl} kind="human" size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] leading-tight text-text">
              {user.displayName}
            </span>
            <span className="block truncate font-mono text-[11px] leading-tight text-faint">
              {user.email ?? role}
            </span>
          </span>
        </Link>
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
  chats: initialChats,
  bots,
  inboxCount: initialInboxCount,
  user,
  role,
  children,
}: {
  org: { slug: string; name: string }
  orgs: OrgSummary[]
  chats: ChatListItem[]
  bots: BotLink[]
  inboxCount: number
  user: {
    id: string
    displayName: string
    avatarUrl: string | null
    email: string | null
    notifications: "all" | "mentions" | "off"
    sound: boolean
  }
  role: OrgRole
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
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

  const currentRoomId = useMemo(() => {
    const match = /\/r\/([^/]+)/.exec(pathname)
    return match?.[1] ?? null
  }, [pathname])

  const activity = useWorkspaceActivity({
    orgSlug: org.slug,
    role,
    userId: user.id,
    userName: user.displayName,
    notifications: user.notifications,
    sound: user.sound,
    chats: initialChats,
    inboxCount: initialInboxCount,
    currentRoomId,
  })
  const inboxCount = activity.inboxCount
  // The room on screen is being read, even if the server has not recorded that yet.
  const chats = useMemo(
    () =>
      activity.chats.map((chat) =>
        chat.id === currentRoomId ? { ...chat, unreadCount: 0, mentionCount: 0 } : chat,
      ),
    [activity.chats, currentRoomId],
  )
  const totalUnread = attentionUnread(chats)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        router.push(`/${org.slug}/search`)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [org.slug, router])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-void md:flex-row">
      <aside className="hidden w-[268px] shrink-0 border-r border-line md:block">
        <SidebarContent
          org={org}
          orgs={orgs}
          chats={chats}
          bots={bots}
          inboxCount={inboxCount}
          user={user}
          role={role}
          pathname={pathname}
        />
      </aside>

      <div className="flex shrink-0 items-center gap-3 border-b border-line bg-ink px-3 pb-1 pt-[max(0.25rem,env(safe-area-inset-top))] md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open workspace menu"
        >
          <MenuIcon />
        </Button>
        <span className="grid h-5 w-5 place-items-center bg-accent font-mono text-[12px] font-medium text-void">
          m
        </span>
        <span className="truncate text-[13px] text-text">{org.name}</span>
        {inboxCount + totalUnread > 0 ? (
          <span className="ml-auto grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[11px] font-medium text-void">
            {inboxCount + totalUnread > 99 ? "99+" : inboxCount + totalUnread}
          </span>
        ) : null}
      </div>

      <main id="main-content" tabIndex={-1} className="min-h-0 min-w-0 flex-1 outline-none">
        {children}
      </main>

      <dialog
        ref={dialogRef}
        className="m-0 h-dvh max-h-none w-[86vw] max-w-[320px] bg-ink p-0 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-text backdrop:bg-void/70"
        onClose={() => setMobileOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setMobileOpen(false)
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="font-mono text-[12px] text-faint">workspace</span>
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
              chats={chats}
              bots={bots}
              inboxCount={inboxCount}
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
