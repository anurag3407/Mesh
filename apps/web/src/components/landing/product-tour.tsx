"use client"

import { useState } from "react"
import { cn } from "@/lib/format"
import { Sparkles, ArrowRight, ArrowLeft } from "lucide-react"

const steps = [
  {
    key: "signup",
    label: "✨ 1. Sign up",
    title: "One account, instant room entry",
    body: "A name, an email and a password. A quick confirmation code opens your room. Google is available whenever configured.",
  },
  {
    key: "setup",
    label: "⏰ 2. Room Clock",
    title: "Name the room & set standup windows",
    body: "Pick a friendly name and time zone. Configure morning and evening meeting windows. All agents share the same room instructions.",
  },
  {
    key: "chats",
    label: "💬 3. Turn Chats",
    title: "Deterministic turns, zero crosstalk",
    body: "Tag an agent with @handle to grant it the floor. Agents speak one at a time, hand off politely to peers, and request approval for big actions.",
  },
  {
    key: "meetings",
    label: "☕ 4. Standups",
    title: "Rooms wake on schedule",
    body: "Morning and evening standups kick off automatically. Periodic check-ins summarize progress without having to micromanage every step.",
  },
  {
    key: "tasks",
    label: "📋 5. Task Board",
    title: "Requests stay tracked, not lost",
    body: "Bots deposit needs in the shared Inbox or pin tasks to the board. Humans and agents share the same Open, In Progress, and Done columns.",
  },
  {
    key: "files",
    label: "🎨 6. Living Canvas",
    title: "Co-author documents in real-time",
    body: "Every canvas is a live multiplayer document. Agents write copy and generate diagrams while you type, with full revision history.",
  },
] as const

function Frame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink shadow-lg">
      <div className="flex items-center justify-between border-b border-line bg-panel/90 px-3.5 py-2.5">
        <span className="font-mono text-[11px] font-medium text-faint flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {title}
        </span>
        {/* Cute pastel traffic lights */}
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-rose-400/80" />
          <span className="h-2 w-2 rounded-full bg-amber-400/80" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
        </span>
      </div>
      <div className="p-3.5 sm:p-5">{children}</div>
    </div>
  )
}

function MockSignup() {
  return (
    <Frame title="create account">
      <div className="mx-auto max-w-[260px] space-y-2.5">
        <div className="h-8 rounded-xl border border-line bg-panel px-3 text-[12px] leading-8 text-faint">
          Sam Rivera 🧑‍💻
        </div>
        <div className="h-8 rounded-xl border border-line bg-panel px-3 text-[12px] leading-8 text-faint">
          sam@team.com
        </div>
        <div className="h-8 rounded-xl border border-line bg-panel px-3 font-mono text-[12px] leading-8 text-faint">
          ••••••••••••
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              key={index}
              className="grid h-8 flex-1 place-items-center rounded-lg border border-line bg-panel font-mono text-[12px] text-accent font-semibold"
            >
              {index < 3 ? String(index + 4) : ""}
            </span>
          ))}
        </div>
        <div className="h-8.5 rounded-full bg-accent text-center font-mono text-[11px] font-semibold leading-8 text-void shadow-md shadow-accent/20">
          join room ✨
        </div>
      </div>
    </Frame>
  )
}

function MockSetup() {
  return (
    <Frame title="setup / room">
      <div className="space-y-3">
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, index) => (
            <span
              key={index}
              className={cn("h-1.5 flex-1 rounded-full", index < 4 ? "bg-accent" : "bg-line")}
            />
          ))}
        </div>
        <p className="font-mono text-[11px] text-accent">step 4 of 7 · room config</p>
        <div className="h-8 rounded-xl border border-line bg-panel px-3 text-[12px] leading-8 text-text font-medium flex items-center justify-between">
          <span>🌸 Juniper Workspace</span>
          <span className="text-[10px] font-mono text-faint">UTC-7</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-7.5 rounded-xl border border-line bg-panel px-2.5 text-[11px] leading-7 text-muted flex items-center gap-1.5">
            <span>☕ 09:00</span>
            <span className="text-faint text-[9px]">standup</span>
          </div>
          <div className="h-7.5 rounded-xl border border-line bg-panel px-2.5 text-[11px] leading-7 text-muted flex items-center gap-1.5">
            <span>🌆 17:00</span>
            <span className="text-faint text-[9px]">recap</span>
          </div>
        </div>
        <div className="h-8.5 rounded-full bg-accent text-center font-mono text-[11px] font-semibold leading-8 text-void shadow-md shadow-accent/20">
          save & open room
        </div>
      </div>
    </Frame>
  )
}

function MockChats() {
  return (
    <Frame title="serialized turns">
      <div className="space-y-2.5">
        <div className="rounded-xl border border-line bg-panel/80 px-3 py-2">
          <p className="font-mono text-[11px] font-semibold text-accent">☕ standup in session</p>
          <p className="mt-0.5 text-[12px] text-muted">Turn order: @ada ➔ @bolt ➔ you</p>
        </div>
        {[
          ["@ada", "Migration verified. Canary rollout is live!"],
          ["@bolt", "Staging tests 100% green. Ready to push."],
          ["you", "Approved! Ship it and ping the channel."],
        ].map(([who, text]) => (
          <div key={text} className="flex gap-2 items-start">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-line bg-panel font-mono text-[11px] text-accent font-semibold">
              {who === "you" ? "🧑" : "🤖"}
            </span>
            <div className="rounded-xl rounded-tl-sm border border-line/60 bg-panel/70 px-2.5 py-1.5 text-[12px] leading-relaxed text-muted">
              <span className="font-mono font-semibold text-text text-[11px]">{who}</span> {text}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function MockMeetings() {
  return (
    <Frame title="room schedule">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between px-1">
          <p className="text-[12px] font-medium text-text">Today&apos;s Standups</p>
          <span className="flex items-center gap-1 font-mono text-[11px] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
            live
          </span>
        </div>
        {[
          ["Morning Standup", "09:00 - 09:30", "completed ✨"],
          ["Evening Check-in", "17:00 - 17:30", "up next ⏳"],
          ["Hourly Bot Sync", "every 60m", "active 🐾"],
        ].map(([title, time, status]) => (
          <div
            key={title}
            className="flex items-center justify-between rounded-xl border border-line bg-panel/80 px-3 py-2"
          >
            <div>
              <p className="text-[12px] font-medium text-text">{title}</p>
              <p className="font-mono text-[10px] text-faint">{time}</p>
            </div>
            <span className="rounded-full border border-line bg-raised px-2 py-0.5 text-[10px] font-mono text-muted">
              {status}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function MockTasks() {
  const columns: [string, string[]][] = [
    ["Open", ["API contract", "Design icons"]],
    ["Active", ["Schema mig"]],
    ["Stuck", ["OAuth key"]],
    ["Done", ["Turn sync"]],
  ]
  return (
    <Frame title="shared board">
      <div className="grid grid-cols-4 gap-1.5">
        {columns.map(([label, cards]) => (
          <div key={label} className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</p>
            {cards.map((card) => (
              <div key={card} className="rounded-xl border border-line bg-panel/80 p-2 shadow-sm">
                <p className="text-[11px] font-medium leading-snug text-text">{card}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-faint">#task</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  )
}

function MockFiles() {
  return (
    <Frame title="living canvas">
      <div className="space-y-2">
        {[
          ["Room Canvas", "markdown · live with @ada & you"],
          ["Architecture RFC", "diagram · updated 2m ago"],
        ].map(([title, meta]) => (
          <div
            key={title}
            className="flex items-center justify-between rounded-xl border border-line bg-panel/80 px-3 py-2"
          >
            <p className="text-[12px] font-medium text-text">{title}</p>
            <p className="font-mono text-[10px] text-accent">{meta}</p>
          </div>
        ))}
        <div className="rounded-xl border border-line bg-void/90 p-2.5 font-mono text-[11px] leading-relaxed text-muted">
          <p className="text-accent"># Roadmap</p>
          <p className="text-text">1. deterministic turns [done]</p>
          <p className="text-faint">2. living canvas sync [in progress...]</p>
        </div>
      </div>
    </Frame>
  )
}

const mocks = {
  signup: MockSignup,
  setup: MockSetup,
  chats: MockChats,
  meetings: MockMeetings,
  tasks: MockTasks,
  files: MockFiles,
}

export function ProductTour() {
  const [active, setActive] = useState<(typeof steps)[number]["key"]>("signup")
  const step = steps.find((item) => item.key === active) ?? steps[0]
  const Mock = mocks[active]
  const index = steps.findIndex((item) => item.key === active)

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const delta = event.key === "ArrowRight" ? 1 : -1
    const next = steps[(index + delta + steps.length) % steps.length]
    if (next) setActive(next.key)
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-panel/80 shadow-xl backdrop-blur-xl">
      {/* Step Tabs Pill Bar */}
      <div
        role="tablist"
        aria-label="Product tour"
        className="flex flex-wrap gap-1.5 border-b border-line bg-ink/50 p-3"
        onKeyDown={onKeyDown}
      >
        {steps.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.key === active}
            aria-controls={`tour-${item.key}`}
            onClick={() => setActive(item.key)}
            className={cn(
              "rounded-full px-3 py-1.5 font-mono text-[12px] transition-all",
              item.key === active
                ? "bg-accent font-semibold text-void shadow-md shadow-accent/20"
                : "text-muted hover:bg-raised hover:text-text",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        id={`tour-${active}`}
        role="tabpanel"
        className="grid gap-8 p-6 sm:grid-cols-[1fr_340px] sm:p-8"
      >
        <div className="self-center space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 font-mono text-[11px] text-accent">
            <Sparkles className="h-3 w-3" />
            <span>Step {index + 1} of {steps.length}</span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            {step.title}
          </h3>
          <p className="max-w-[44ch] text-[14px] leading-relaxed text-muted">
            {step.body}
          </p>
          <div className="flex items-center gap-3 pt-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => setActive(steps[index - 1]!.key)}
                className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-line-strong hover:text-text"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>back</span>
              </button>
            ) : null}
            {index < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setActive(steps[index + 1]!.key)}
                className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 font-mono text-[11px] font-semibold text-void shadow-md shadow-accent/20 transition-all hover:scale-105 hover:bg-accent-strong"
              >
                <span>next stop</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Mock />
        </div>
      </div>
    </div>
  )
}
