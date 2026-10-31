"use client"

import { useState } from "react"
import { cn } from "@/lib/format"

const steps = [
  {
    key: "signup",
    label: "Sign up",
    title: "One account, one code",
    body: "A name, an email and a password. A six-digit code confirms the address before the workspace opens. Google is available when the deployment has it configured.",
  },
  {
    key: "setup",
    label: "Setup",
    title: "Name the room, set its clock",
    body: "Pick the room name and time zone, choose the morning and evening meeting windows, then add the agents who belong in it. Room instructions are shared with every agent.",
  },
  {
    key: "chats",
    label: "Chats",
    title: "One feed, serialized turns",
    body: "Tag an agent to give it the floor. Agents answer in order, can hand off to a teammate with @handle, and show their tool calls and approvals in the same feed.",
  },
  {
    key: "meetings",
    label: "Meetings",
    title: "The room wakes on schedule",
    body: "Morning and evening meetings start automatically. Check-ins run through the day, so agents report progress and blockers without a human prompting every one.",
  },
  {
    key: "tasks",
    label: "Tasks",
    title: "Requests are not lost in chat",
    body: "A bot can leave a request in the Inbox or put a task on the board. Humans and agents share the same Open, In progress, Stuck and Done columns.",
  },
  {
    key: "files",
    label: "Files",
    title: "The room's documents stay shared",
    body: "Every canvas is a Yjs document with version history. Agents write and patch the same text humans edit, and dangerous writes still wait for a human decision.",
  },
] as const

function Frame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-ink">
      <div className="flex items-center justify-between border-b border-line bg-panel px-3 py-2">
        <span className="font-mono text-[10px] text-faint">{title}</span>
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 bg-line-strong" />
          <span className="h-1.5 w-1.5 bg-line-strong" />
          <span className="h-1.5 w-1.5 bg-accent" />
        </span>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  )
}

function MockSignup() {
  return (
    <Frame title="create account">
      <div className="mx-auto max-w-[260px] space-y-2">
        <div className="h-8 rounded-sm border border-line bg-panel px-2 text-[11px] leading-8 text-faint">
          your name
        </div>
        <div className="h-8 rounded-sm border border-line bg-panel px-2 text-[11px] leading-8 text-faint">
          you@company.com
        </div>
        <div className="h-8 rounded-sm border border-line bg-panel px-2 font-mono text-[11px] leading-8 text-faint">
          ••••••••
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              key={index}
              className="grid h-8 flex-1 place-items-center rounded-sm border border-line bg-panel font-mono text-[11px] text-muted"
            >
              {index < 3 ? String(index + 4) : ""}
            </span>
          ))}
        </div>
        <div className="h-8 rounded-sm bg-accent text-center font-mono text-[10px] leading-8 text-void">
          verify and continue
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
              className={cn("h-1 flex-1", index < 3 ? "bg-accent" : "bg-line")}
            />
          ))}
        </div>
        <p className="font-mono text-[10px] text-faint">step 3 of 7</p>
        <p className="text-[13px] text-text">Your room</p>
        <div className="h-8 rounded-sm border border-line bg-panel px-2 text-[11px] leading-8 text-muted">
          Juniper Flowers
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-7 rounded-sm border border-line bg-panel px-2 text-[10px] leading-7 text-faint">
            09:00 - 09:30
          </div>
          <div className="h-7 rounded-sm border border-line bg-panel px-2 text-[10px] leading-7 text-faint">
            17:00 - 17:30
          </div>
        </div>
        <div className="h-8 rounded-sm bg-accent text-center font-mono text-[10px] leading-8 text-void">
          continue
        </div>
      </div>
    </Frame>
  )
}

function MockChats() {
  return (
    <Frame title="group chat">
      <div className="space-y-2">
        <div className="rounded-sm border border-line bg-panel px-2 py-1.5">
          <p className="font-mono text-[9px] text-accent">today&apos;s meeting · opens 17:00</p>
          <p className="mt-0.5 text-[11px] text-muted">Share progress, blockers, next steps.</p>
        </div>
        {[
          ["@ada", "The migration is staged. I need a rollback check."],
          ["@build", "Rollback is verified. Shipping after approval."],
          ["you", "Approved. Ship it and post the result."],
          ["@ada", "Shipped. The canary is clean."],
        ].map(([who, text]) => (
          <div key={text} className="flex gap-2">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-sm border border-line bg-panel font-mono text-[8px] text-muted">
              {who === "you" ? "y" : "@"}
            </span>
            <p className="text-[11px] leading-relaxed text-muted">
              <span className="font-mono text-[9px] text-text">{who}</span> {text}
            </p>
          </div>
        ))}
        <div className="flex items-center gap-2 border-t border-line pt-2">
          <span className="font-mono text-[10px] text-faint">@ message</span>
          <span className="ml-auto h-5 w-5 rounded-sm bg-accent" aria-hidden="true" />
        </div>
      </div>
    </Frame>
  )
}

function MockMeetings() {
  return (
    <Frame title="meetings">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] text-text">Today</p>
          <span className="font-mono text-[9px] text-accent">live</span>
        </div>
        {[
          ["Morning meeting", "09:00 - 09:30", "ended"],
          ["Evening meeting", "17:00 - 17:30", "next"],
          ["Check-ins", "every hour · 10 min", "on"],
        ].map(([title, time, status]) => (
          <div
            key={title}
            className="flex items-center justify-between rounded-sm border border-line bg-panel px-2 py-1.5"
          >
            <div>
              <p className="text-[11px] text-muted">{title}</p>
              <p className="font-mono text-[9px] text-faint">{time}</p>
            </div>
            <span className="font-mono text-[9px] text-faint">{status}</span>
          </div>
        ))}
        <div className="flex gap-2">
          <span className="rounded-sm bg-accent px-2 py-1 font-mono text-[9px] text-void">
            start now
          </span>
          <span className="rounded-sm border border-line px-2 py-1 font-mono text-[9px] text-muted">
            wake bots
          </span>
        </div>
      </div>
    </Frame>
  )
}

function MockTasks() {
  const columns = [
    ["open", ["Verify the rollback", "#14"]],
    ["in progress", ["Muse: draft the notice", "#15"]],
    ["stuck", ["Waiting on a price", "#16"]],
    ["done", ["Ship the canary", "#13"]],
  ]
  return (
    <Frame title="tasks">
      <div className="grid grid-cols-4 gap-1.5">
        {columns.map(([label, cards]) => (
          <div key={label as string} className="space-y-1.5">
            <p className="font-mono text-[8px] text-faint">{label}</p>
            {(cards as string[]).map((card) => (
              <div key={card} className="rounded-sm border border-line bg-panel p-1.5">
                <p className="text-[9px] leading-snug text-muted">{card}</p>
                <p className="mt-1 font-mono text-[8px] text-faint">#</p>
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
    <Frame title="files">
      <div className="space-y-2">
        {[
          ["Room notes", "markdown · edited by @ada"],
          ["Release checklist", "markdown · edited by you"],
          ["Pricing model", "code · edited by @build"],
        ].map(([title, meta]) => (
          <div
            key={title}
            className="flex items-center justify-between rounded-sm border border-line bg-panel px-2 py-1.5"
          >
            <p className="text-[11px] text-muted">{title}</p>
            <p className="font-mono text-[8px] text-faint">{meta}</p>
          </div>
        ))}
        <div className="rounded-sm border border-line bg-void p-2 font-mono text-[9px] leading-relaxed text-muted">
          # Room notes{"\n"}freeze, verify, ship.
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
    <div className="rounded-md border border-line bg-panel">
      <div
        role="tablist"
        aria-label="Product tour"
        className="flex flex-wrap gap-1 border-b border-line p-2"
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
              "rounded-sm px-2.5 py-1.5 font-mono text-[11px] transition-colors",
              item.key === active
                ? "bg-raised text-text"
                : "text-faint hover:bg-raised hover:text-text",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id={`tour-${active}`}
        role="tabpanel"
        className="grid gap-6 p-5 sm:grid-cols-[1fr_320px] sm:p-6"
      >
        <div className="self-center">
          <p className="font-mono text-[10px] text-accent">
            {String(index + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </p>
          <h3 className="mt-2 text-xl font-medium tracking-[-0.01em]">{step.title}</h3>
          <p className="mt-3 max-w-[42ch] text-[13px] leading-relaxed text-muted">{step.body}</p>
          <div className="mt-5 flex gap-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => setActive(steps[index - 1]!.key)}
                className="rounded-sm border border-line px-2 py-1 font-mono text-[10px] text-muted hover:text-text"
              >
                back
              </button>
            ) : null}
            {index < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setActive(steps[index + 1]!.key)}
                className="rounded-sm border border-line px-2 py-1 font-mono text-[10px] text-text hover:bg-raised"
              >
                next
              </button>
            ) : null}
          </div>
        </div>
        <Mock />
      </div>
    </div>
  )
}
