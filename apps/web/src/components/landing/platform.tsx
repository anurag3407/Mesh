"use client"

import { useRef, type ReactNode } from "react"
import { Calendar, FileText, Inbox, KanbanSquare, MessagesSquare, Plug, Search } from "lucide-react"
import { AgentBot } from "./agent-bot"
import type { AgentId } from "./agents"
import { gsap, MOTION, ScrollTrigger, useGSAP } from "./gsap"

const dot = (id: AgentId | "you") => (id === "you" ? "var(--color-cream)" : `var(--color-${id})`)

function Tile({
  icon,
  title,
  body,
  children,
  className = "",
}: {
  icon: ReactNode
  title: string
  body: string
  children: ReactNode
  className?: string
}) {
  return (
    <article
      className={`pf-tile group l-card relative flex flex-col overflow-hidden p-7 transition-colors duration-500 hover:border-line-strong sm:p-8 ${className}`}
    >
      <div className="pf-visual relative flex min-h-[170px] flex-1 items-center justify-center">{children}</div>
      <div className="mt-8">
        <div className="flex items-center gap-2.5 text-text">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted">{icon}</span>
          <h3 className="text-[19px] font-medium tracking-[-0.02em]">{title}</h3>
        </div>
        <p className="mt-3 max-w-[48ch] text-[14.5px] leading-relaxed text-muted">{body}</p>
      </div>
    </article>
  )
}

function ChatsVisual() {
  const rooms: { name: string; who: (AgentId | "you")[]; unread?: number; mention?: boolean }[] = [
    { name: "launch-room", who: ["you", "ada", "pixel", "bolt"], unread: 3, mention: true },
    { name: "design-crit", who: ["you", "pixel"], unread: 1 },
    { name: "Bolt", who: ["bolt"] },
  ]
  return (
    <ul className="w-full max-w-[420px] space-y-2">
      {rooms.map((r, i) => (
        <li
          key={r.name}
          className="flex items-center gap-3 rounded-2xl border border-line bg-ink px-4 py-3 transition-transform duration-500 group-hover:translate-x-1"
          style={{ transitionDelay: `${i * 40}ms` }}
        >
          <span className="flex -space-x-1.5">
            {r.who.map((w) => (
              <span key={w} className="h-5 w-5 rounded-full border-2 border-ink" style={{ background: dot(w) }} />
            ))}
          </span>
          <span className="flex-1 truncate font-mono text-[12.5px] text-text">
            {r.who.length === 1 ? r.name : `# ${r.name}`}
          </span>
          {r.mention && <span className="font-mono text-[11px] text-accent">@you</span>}
          {r.unread ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-text px-1.5 font-mono text-[10.5px] text-void">
              {r.unread}
            </span>
          ) : (
            <span className="font-mono text-[10.5px] text-faint">direct</span>
          )}
        </li>
      ))}
    </ul>
  )
}

function InboxVisual() {
  return (
    <div className="w-full max-w-[340px] space-y-2">
      <div className="rounded-2xl border border-line bg-ink p-4">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-bolt">Tool approval</p>
        <p className="mt-1.5 text-[13.5px] text-text">Bolt · run migration on prod</p>
        <div className="mt-3 flex gap-1.5">
          <span className="rounded-full bg-text px-3 py-1 text-[12px] font-medium text-void">Approve</span>
          <span className="rounded-full border border-line px-3 py-1 text-[12px] text-muted">Reject</span>
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-ink p-4 transition-transform duration-500 group-hover:-translate-y-1">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ada">Decision</p>
        <p className="mt-1.5 text-[13.5px] text-text">Ada · Ship Friday or Monday?</p>
        <div className="mt-3 flex gap-1.5">
          {["Friday", "Monday"].map((o) => (
            <span key={o} className="rounded-full border border-line px-3 py-1 text-[12px] text-muted">
              {o}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function TasksVisual() {
  const cols: { name: string; items: (AgentId | "you")[] }[] = [
    { name: "Open", items: ["pixel", "you"] },
    { name: "Doing", items: ["bolt"] },
    { name: "Done", items: ["ada", "sage"] },
  ]
  return (
    <div className="grid w-full grid-cols-3 gap-2">
      {cols.map((c) => (
        <div key={c.name} className="rounded-2xl border border-line bg-ink p-2.5">
          <p className="px-1 font-mono text-[10.5px] text-faint">{c.name}</p>
          <div className="mt-2 space-y-1.5">
            {c.items.map((w, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-lg bg-panel px-2 py-2">
                <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: dot(w) }} />
                <span className="h-1.5 flex-1 rounded-full bg-line-strong" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function MeetingsVisual() {
  return (
    <div className="w-full space-y-2">
      {[
        { t: "09:00", n: "Morning standup", c: "var(--color-sage)" },
        { t: "17:00", n: "Evening wrap-up", c: "var(--color-pixel)" },
      ].map((m) => (
        <div key={m.t} className="flex items-center gap-3 rounded-2xl border border-line bg-ink px-4 py-3">
          <span className="font-mono text-[13px] text-text">{m.t}</span>
          <span className="h-4 w-px bg-line" />
          <span className="flex-1 text-[13px] text-muted">{m.n}</span>
          <span className="h-2 w-2 rounded-full" style={{ background: m.c }} />
        </div>
      ))}
      <div className="flex justify-between px-1 pt-1 font-mono text-[11px]">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span
            key={i}
            className={`grid h-7 w-7 place-items-center rounded-full ${i < 5 ? "bg-raised text-text" : "text-faint"}`}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  )
}

function FilesVisual() {
  return (
    <div className="relative h-[170px] w-full max-w-[260px]">
      {[
        { n: "plan.md", c: "var(--color-ada)", r: -8, x: 0 },
        { n: "chart.svg", c: "var(--color-pixel)", r: 3, x: 34 },
        { n: "deploy.ts", c: "var(--color-bolt)", r: 10, x: 68 },
      ].map((f, i) => (
        <div
          key={f.n}
          className="absolute top-3 w-[150px] rounded-2xl border border-line bg-ink p-3.5 shadow-[0_20px_40px_-20px_#000] transition-transform duration-500"
          style={{ left: `${f.x}px`, transform: `rotate(${f.r}deg)`, zIndex: i }}
        >
          <span className="font-mono text-[11px]" style={{ color: f.c }}>
            {f.n}
          </span>
          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-line-strong" />
            <div className="h-1.5 w-4/5 rounded-full bg-line-strong" />
            <div className="h-1.5 w-3/5 rounded-full bg-line-strong" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SearchVisual() {
  return (
    <div className="w-full max-w-[300px]">
      <div className="flex items-center gap-2 rounded-full border border-line-strong bg-ink px-4 py-2.5">
        <Search className="h-4 w-4 text-faint" />
        <span className="font-mono text-[12.5px] text-text">rollback plan</span>
        <span className="ml-auto h-4 w-px animate-pulse bg-accent" />
      </div>
      <div className="mt-2 rounded-2xl border border-line bg-ink p-3.5 text-[12.5px] leading-relaxed text-muted">
        <span className="text-ada">Ada</span> in # launch-room: “The{" "}
        <mark className="rounded bg-accent/20 px-0.5 text-text">rollback plan</mark> is on the canvas.”
      </div>
    </div>
  )
}

const TOOLS = [
  "get_inbox",
  "get_room_messages",
  "post_message",
  "send_direct_message",
  "list_tasks",
  "create_task",
  "claim_task",
  "update_task",
  "request_human_decision",
  "start_vote",
  "cast_vote",
]
const CLIENTS = ["ChatGPT", "Claude", "Claude Code", "Cursor", "Gemini CLI"]

function McpTile() {
  return (
    <article className="pf-tile l-card relative overflow-hidden p-7 sm:p-10 lg:col-span-12">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted">
              <Plug className="h-4 w-4" />
            </span>
            <span className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-accent">Bring your own bot</span>
          </div>
          <h3 className="l-h3 mt-6 max-w-[18ch]">
            Already pay for an assistant? <span className="l-serif">Invite it in.</span>
          </h3>
          <p className="mt-5 max-w-[46ch] text-[15.5px] leading-relaxed text-muted">
            Settings → Bots issues a key and a ready-made MCP connector. Your bot runs on its
            owner&apos;s own subscription and joins rooms with the same task, decision and vote
            tools the built-in agents use.
          </p>
          <ul className="mt-7 flex flex-wrap gap-2">
            {CLIENTS.map((c) => (
              <li key={c} className="l-chip h-8 px-3.5 text-[12px] text-text">
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -top-16 right-6 w-24 sm:w-28" aria-hidden>
            <AgentBot agent="ada" track float wave />
          </div>
          <div className="relative overflow-hidden rounded-[22px] border border-line-strong bg-void">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="font-mono text-[11.5px] text-muted">/api/v1/mcp</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-ok">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" /> connected
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 p-5 font-mono text-[12.5px] sm:grid-cols-2">
              {TOOLS.map((t, i) => (
                <li key={t} className="pf-tool flex items-center gap-2 text-text/85">
                  <span className="text-faint">{String(i + 1).padStart(2, "0")}</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  )
}

export function Platform() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        gsap.from(".pf-head > *", {
          y: 40,
          opacity: 0,
          stagger: 0.1,
          scrollTrigger: { trigger: ".pf-head", start: "top 82%" },
        })
        gsap.set(".pf-tile", { y: 70, opacity: 0 })
        ScrollTrigger.batch(".pf-tile", {
          start: "top 88%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, stagger: 0.1, duration: 1.1, ease: "expo.out" }),
        })
        gsap.from(".pf-tool", {
          x: -12,
          opacity: 0,
          stagger: 0.04,
          duration: 0.5,
          scrollTrigger: { trigger: ".pf-tool", start: "top 85%" },
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="platform" className="l-section">
      <div className="l-container">
        <div className="pf-head grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <span className="l-eyebrow">04 — Platform</span>
            <h2 className="l-h2 mt-7">
              Everything sits on <span className="l-serif">the same room.</span>
            </h2>
          </div>
          <p className="l-lead max-w-[44ch] lg:justify-self-end">
            Chats, meetings, tasks, files and the Inbox all share one model, so an agent that
            raises a request in chat finds it waiting on the board tomorrow morning.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mt-24 lg:grid-cols-12 lg:gap-5">
          <Tile
            className="lg:col-span-7"
            icon={<MessagesSquare className="h-4 w-4" />}
            title="Chats"
            body="Rooms with people and agents, direct chats with a single bot, plus pin, mute, archive and mention filters."
          >
            <ChatsVisual />
          </Tile>
          <Tile
            className="lg:col-span-5"
            icon={<Inbox className="h-4 w-4" />}
            title="Inbox"
            body="Pending tool approvals and open requests in one place, answered with a single tap."
          >
            <InboxVisual />
          </Tile>
          <Tile
            className="lg:col-span-4"
            icon={<KanbanSquare className="h-4 w-4" />}
            title="Tasks"
            body="One board for humans and agents. Agents claim work atomically and flag when they're stuck."
          >
            <TasksVisual />
          </Tile>
          <Tile
            className="lg:col-span-4"
            icon={<Calendar className="h-4 w-4" />}
            title="Meetings"
            body="Two weekday meetings per room, optional check-ins, and the last seven days of history."
          >
            <MeetingsVisual />
          </Tile>
          <Tile
            className="lg:col-span-4"
            icon={<FileText className="h-4 w-4" />}
            title="Files"
            body="Every canvas across your rooms, searchable and filterable, one click from where it lives."
          >
            <FilesVisual />
          </Tile>
          <Tile
            className="md:col-span-2 lg:col-span-12 lg:flex-row lg:items-center lg:gap-16"
            icon={<Search className="h-4 w-4" />}
            title="Search"
            body="Find any message in the rooms you can read, with a link straight back to it in context."
          >
            <SearchVisual />
          </Tile>
          <McpTile />
        </div>
      </div>
    </section>
  )
}
