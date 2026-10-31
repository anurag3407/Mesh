"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setChatPreferenceAction } from "@/lib/actions/room-state"
import { EmptyState, InlineAlert } from "@/components/ui/empty"
import { cn } from "@/lib/format"
import type { BotChatView, ChatListItem } from "@/lib/types"

type Filter = "all" | "unread" | "mentions" | "bots" | "archived"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "mentions", label: "Mentions" },
  { key: "bots", label: "Bots" },
  { key: "archived", label: "Archived" },
]

function relativeTime(iso: string | null): string {
  if (!iso) return ""
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (diff < 60_000) return "now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function ChatListRow({
  item,
  orgSlug,
  onAction,
  pending,
}: {
  item: ChatListItem
  orgSlug: string
  onAction: (
    action: "pin" | "unpin" | "mute" | "unmute" | "archive" | "unarchive" | "mark_unread",
    duration?: "8h" | "1w" | "always",
  ) => void
  pending: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const muted = item.mutedUntil ? new Date(item.mutedUntil).getTime() > Date.now() : false
  const unread = item.unreadCount > 0
  const mark = item.isBotDm ? "@" : item.kind === "public" ? "#" : "·"

  return (
    <li className="relative border-b border-line last:border-b-0">
      <div className="group flex items-start gap-3 py-3 pr-2 transition-colors hover:bg-raised/50">
        <Link
          href={`/${orgSlug}/r/${item.id}`}
          className="flex min-w-0 flex-1 items-start gap-3 pl-1"
        >
          <span
            className={cn(
              "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-[12px]",
              item.isBotDm
                ? "border-[color-mix(in_srgb,var(--color-accent)_35%,transparent)] bg-accent-soft text-accent"
                : "border-line-strong bg-panel text-muted",
            )}
            aria-hidden="true"
          >
            {mark}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span
                className={cn(
                  "truncate text-[13px]",
                  unread ? "font-medium text-text" : "text-text/90",
                )}
              >
                {item.name}
              </span>
              {item.pinned ? <span className="font-mono text-[9px] text-accent">pinned</span> : null}
              <span className="ml-auto shrink-0 font-mono text-[10px] text-faint">
                {relativeTime(item.lastAt)}
              </span>
            </span>
            <span className="mt-0.5 flex items-baseline gap-2">
              <span className={cn("truncate text-[12px]", unread ? "text-muted" : "text-faint")}>
                {item.lastSender ? `${item.lastSender}: ` : ""}
                {item.lastMessage ?? (item.isBotDm ? "Direct chat with a bot" : "No messages yet")}
              </span>
              {item.mentionCount > 0 ? (
                <span className="ml-auto shrink-0 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9px] font-medium text-void">
                  {item.mentionCount}
                </span>
              ) : unread ? (
                <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              ) : null}
            </span>
            <span className="mt-1 flex items-center gap-2 font-mono text-[9px] text-faint">
              <span>{item.isBotDm ? "bot dm" : item.kind}</span>
              {item.agentNames.length && !item.isBotDm ? (
                <span>· {item.agentNames.slice(0, 3).join(", ")}</span>
              ) : null}
              {muted ? <span>· muted</span> : null}
              {item.mentionCount > 0 ? <span className="text-accent">· mentioned you</span> : null}
            </span>
          </span>
        </Link>
        <div className="relative shrink-0 pt-1">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={`Options for ${item.name}`}
            className="grid h-6 w-6 place-items-center rounded-sm font-mono text-[12px] text-faint hover:bg-raised hover:text-text"
          >
            ···
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-7 z-20 w-44 border border-line bg-panel py-1 text-[12px] shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    onAction(item.pinned ? "unpin" : "pin")
                    setMenuOpen(false)
                  }}
                  className="block w-full px-3 py-1.5 text-left text-muted hover:bg-raised hover:text-text disabled:opacity-50"
                >
                  {item.pinned ? "Unpin chat" : "Pin chat"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    onAction("mark_unread")
                    setMenuOpen(false)
                  }}
                  className="block w-full px-3 py-1.5 text-left text-muted hover:bg-raised hover:text-text disabled:opacity-50"
                >
                  Mark unread
                </button>
                {muted ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      onAction("unmute")
                      setMenuOpen(false)
                    }}
                    className="block w-full px-3 py-1.5 text-left text-muted hover:bg-raised hover:text-text disabled:opacity-50"
                  >
                    Unmute
                  </button>
                ) : (
                  <>
                    <p className="px-3 pb-0.5 pt-1.5 font-mono text-[9px] text-faint">mute for</p>
                    {(["8h", "1w", "always"] as const).map((duration) => (
                      <button
                        key={duration}
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          onAction("mute", duration)
                          setMenuOpen(false)
                        }}
                        className="block w-full px-3 py-1.5 text-left text-muted hover:bg-raised hover:text-text disabled:opacity-50"
                      >
                        {duration === "8h" ? "8 hours" : duration === "1w" ? "1 week" : "Until I unmute"}
                      </button>
                    ))}
                  </>
                )}
                <div className="my-1 h-px bg-line" />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    onAction(item.archived ? "unarchive" : "archive")
                    setMenuOpen(false)
                  }}
                  className="block w-full px-3 py-1.5 text-left text-muted hover:bg-raised hover:text-text disabled:opacity-50"
                >
                  {item.archived ? "Unarchive" : "Archive chat"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function HandoffRail({ orgSlug, handoffs }: { orgSlug: string; handoffs: BotChatView[] }) {
  return (
    <aside className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium">Agent handoffs</h2>
        <span className="font-mono text-[10px] text-faint">read-only</span>
      </div>
      <p className="mt-2 max-w-[36ch] text-[12px] leading-relaxed text-muted">
        When one agent mentions another in a room, the exchange shows up here. Bots cannot start
        chats on their own; humans open the door.
      </p>
      {handoffs.length === 0 ? (
        <p className="mt-5 border-l-2 border-line-strong pl-3 font-mono text-[11px] leading-relaxed text-faint">
          No bot-to-bot handoffs in the last 300 agent messages.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {handoffs.map((handoff) => (
            <li key={handoff.roomId} className="border border-line bg-panel">
              <details>
                <summary className="flex cursor-pointer list-none items-baseline gap-2 px-3 py-2 hover:bg-raised">
                  <span className="truncate text-[12px] text-text">{handoff.roomName}</span>
                  <span className="ml-auto shrink-0 font-mono text-[9px] text-faint">
                    {handoff.messages.length} · {relativeTime(handoff.lastAt)}
                  </span>
                </summary>
                <div className="space-y-2 border-t border-line px-3 py-2.5">
                  {handoff.messages.slice(-6).map((message) => (
                    <div key={message.id} className="text-[12px] leading-relaxed">
                      <p className="font-mono text-[10px] text-accent">
                        @{message.senderHandle}
                        <span className="text-faint">
                          {" → "}
                          {message.mentions.map((mention) => `@${mention}`).join(", ")}
                        </span>
                      </p>
                      <p className="mt-0.5 line-clamp-4 text-muted">{message.content}</p>
                    </div>
                  ))}
                  <p className="pt-1 font-mono text-[10px] text-faint">
                    read-only transcript · open the room to reply
                  </p>
                  <Link
                    href={`/${orgSlug}/r/${handoff.roomId}`}
                    className="inline-block font-mono text-[10px] text-accent underline underline-offset-4"
                  >
                    open room
                  </Link>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

export function ChatsView({
  orgSlug,
  items,
  handoffs,
  inboxCount,
}: {
  orgSlug: string
  items: ChatListItem[]
  handoffs: BotChatView[]
  inboxCount: number
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const counts = {
    all: items.filter((item) => !item.archived).length,
    unread: items.filter((item) => !item.archived && item.unreadCount > 0).length,
    mentions: items.filter((item) => !item.archived && item.mentionCount > 0).length,
    bots: items.filter((item) => !item.archived && item.isBotDm).length,
    archived: items.filter((item) => item.archived).length,
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => {
      if (filter === "archived" ? !item.archived : item.archived) return false
      if (filter === "unread" && item.unreadCount === 0) return false
      if (filter === "mentions" && item.mentionCount === 0) return false
      if (filter === "bots" && !item.isBotDm) return false
      if (!needle) return true
      return (
        item.name.toLowerCase().includes(needle) ||
        (item.lastMessage ?? "").toLowerCase().includes(needle) ||
        item.agentNames.some((name) => name.toLowerCase().includes(needle))
      )
    })
  }, [items, filter, query])

  const pinned = filtered.filter((item) => item.pinned)
  const rest = filtered.filter((item) => !item.pinned)

  function act(
    roomId: string,
    action: "pin" | "unpin" | "mute" | "unmute" | "archive" | "unarchive" | "mark_unread",
    duration?: "8h" | "1w" | "always",
  ) {
    setError(null)
    startTransition(async () => {
      const result = await setChatPreferenceAction({ orgSlug, roomId, action, duration })
      if (!result.ok) setError(result.error ?? "Could not update the chat")
      else router.refresh()
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="font-mono text-[11px] text-faint">workspace</p>
            <h1 className="mt-1 text-2xl font-medium tracking-[-0.02em]">Chats</h1>
            <p className="mt-1.5 font-mono text-[11px] text-muted">
              {counts.all} active {counts.all === 1 ? "chat" : "chats"} · {counts.unread} unread ·{" "}
              {inboxCount} waiting in Inbox
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${orgSlug}/inbox`}
              className="inline-flex h-8 items-center rounded-sm border border-line px-2.5 font-mono text-[11px] text-muted hover:border-line-strong hover:text-text"
            >
              Inbox{inboxCount ? ` · ${inboxCount}` : ""}
            </Link>
            <Link
              href={`/${orgSlug}/chats/new`}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-accent px-3 font-mono text-[11px] font-medium text-void hover:bg-[var(--color-accent-strong)]"
            >
              + New chat
            </Link>
          </div>
        </header>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px]">
          <section aria-labelledby="chat-list-heading">
            <h2 id="chat-list-heading" className="sr-only">
              Chat list
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1" role="group" aria-label="Filter chats">
                {FILTERS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setFilter(option.key)}
                    aria-pressed={filter === option.key}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 font-mono text-[10px] transition-colors",
                      filter === option.key
                        ? "bg-raised text-text"
                        : "text-muted hover:bg-raised/60 hover:text-text",
                    )}
                  >
                    {option.label}
                    {counts[option.key] > 0 ? (
                      <span className="text-faint">{counts[option.key]}</span>
                    ) : null}
                  </button>
                ))}
              </div>
              <label className="ml-auto flex h-8 min-w-[11rem] items-center gap-2 rounded-sm border border-line bg-panel px-2.5 focus-within:border-accent">
                <span className="sr-only">Search chats</span>
                <span aria-hidden="true" className="font-mono text-[11px] text-faint">
                  /
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search chats"
                  className="w-full bg-transparent text-[12px] text-text outline-none placeholder:text-faint"
                />
              </label>
            </div>

            {error ? (
              <div className="mt-4">
                <InlineAlert tone="danger">{error}</InlineAlert>
              </div>
            ) : null}

            {filtered.length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  title={query ? "No chats match that search" : "Nothing here yet"}
                  body={
                    query
                      ? "Try a room name, an agent handle or a phrase from the last message."
                      : "Start a room for your team, or open a direct chat with one of your bots."
                  }
                  action={
                    <Link
                      href={`/${orgSlug}/chats/new`}
                      className="font-mono text-[11px] text-accent underline underline-offset-4"
                    >
                      new chat
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="mt-4">
                {pinned.length ? (
                  <div className="mb-6">
                    <p className="mb-1 font-mono text-[10px] text-faint">pinned</p>
                    <ul className="border-t border-line">
                      {pinned.map((item) => (
                        <ChatListRow
                          key={item.id}
                          item={item}
                          orgSlug={orgSlug}
                          pending={pending}
                          onAction={(action, duration) => act(item.id, action, duration)}
                        />
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div>
                  {pinned.length ? <p className="mb-1 font-mono text-[10px] text-faint">all chats</p> : null}
                  <ul className="border-t border-line">
                    {rest.map((item) => (
                      <ChatListRow
                        key={item.id}
                        item={item}
                        orgSlug={orgSlug}
                        pending={pending}
                        onAction={(action, duration) => act(item.id, action, duration)}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          <HandoffRail orgSlug={orgSlug} handoffs={handoffs} />
        </div>
      </div>
    </div>
  )
}
