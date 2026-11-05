"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { cn } from "@/lib/format"

export interface SetupState {
  canManage: boolean
  hasModel: boolean
  hasAgent: boolean
  roomHasAgent: boolean
  hasMessage: boolean
}

function storageKey(roomId: string): string {
  return `mesh:setup-dismissed:${roomId}`
}

/** Walks a new room through the steps between "empty" and "an agent replied". */
export function SetupChecklist({
  setup,
  orgSlug,
  roomId,
}: {
  setup: SetupState
  orgSlug: string
  roomId: string
}) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey(roomId)) === "1")
    } catch {
      setDismissed(false)
    }
  }, [roomId])

  if (dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      window.localStorage.setItem(storageKey(roomId), "1")
    } catch {
      // Without storage the checklist simply comes back on the next visit.
    }
  }

  if (!setup.canManage) {
    return (
      <div className="m-4 flex items-start gap-3 rounded-md border border-line bg-panel p-4">
        <p className="flex-1 text-[13px] leading-relaxed text-muted">
          No agents are in this room yet. A workspace admin can add one. You can still talk with
          your team here.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="font-mono text-[12px] text-faint hover:text-text"
        >
          Dismiss
        </button>
      </div>
    )
  }

  const steps = [
    {
      label: "Connect an AI model",
      detail: "Add an API key from OpenAI, Anthropic or another provider.",
      done: setup.hasModel,
      href: `/${orgSlug}/settings/keys`,
      cta: "Add key",
    },
    {
      label: "Create an agent",
      detail: "Give it a name and tell it what it is for.",
      done: setup.hasAgent,
      href: `/${orgSlug}/agents?room=${roomId}#create-agent`,
      cta: "Create agent",
    },
    {
      label: "Add the agent to this room",
      detail: "Only agents in a room can reply there.",
      done: setup.roomHasAgent,
      href: `/${orgSlug}/r/${roomId}/settings#room-agents`,
      cta: "Add agent",
    },
    {
      label: "Send your first message",
      detail: "Type @ below and pick your agent.",
      done: setup.hasMessage,
      href: null,
      cta: null,
    },
  ]
  const nextIndex = steps.findIndex((step) => !step.done)

  return (
    <section
      aria-label="Get this room ready"
      className="m-4 rounded-md border border-line-strong bg-panel p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-medium text-text">Get your first agent reply</h2>
        <button
          type="button"
          onClick={dismiss}
          className="font-mono text-[12px] text-faint hover:text-text"
        >
          Dismiss
        </button>
      </div>
      <ol className="mt-3 space-y-2.5">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border font-mono text-[11px]",
                step.done
                  ? "border-ok text-ok"
                  : index === nextIndex
                    ? "border-accent text-accent"
                    : "border-line-strong text-faint",
              )}
            >
              {step.done ? "✓" : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-[13px]", step.done ? "text-muted line-through" : "text-text")}>
                <span className="sr-only">{step.done ? "Done: " : "To do: "}</span>
                {step.label}
              </p>
              {index === nextIndex ? (
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{step.detail}</p>
              ) : null}
            </div>
            {index === nextIndex && step.href ? (
              <Link
                href={step.href}
                className="inline-flex h-10 shrink-0 items-center rounded-sm bg-accent px-3 text-[13px] font-medium text-void hover:bg-[var(--color-accent-strong)] md:h-8 md:text-[12px]"
              >
                {step.cta}
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
