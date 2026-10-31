"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { sendMessage } from "@/lib/actions/messages"
import { enqueueOutbox, flushOutbox, readOutbox } from "@/lib/outbox"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/status"
import { SendIcon } from "@/components/ui/icons"
import { cn } from "@/lib/format"
import type { RoomAgentView } from "@/lib/types"

interface MentionState {
  start: number
  end: number
  query: string
  index: number
}

export function Composer({
  orgSlug,
  roomId,
  threadRootId = null,
  agents,
  placeholder,
  compact = false,
  autoFocus = false,
  onTyping,
  onSent,
}: {
  orgSlug: string
  roomId: string
  threadRootId?: string | null
  agents: RoomAgentView[]
  placeholder: string
  compact?: boolean
  autoFocus?: boolean
  onTyping?: () => void
  onSent?: () => void
}) {
  const [value, setValue] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [mention, setMention] = useState<MentionState | null>(null)
  const [outboxCount, setOutboxCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const options = mention
    ? [
        { handle: "all_bots", displayName: "every agent in the room" },
        ...agents.map(({ agent }) => ({ handle: agent.handle, displayName: agent.displayName })),
      ].filter((option) => {
        const query = mention.query.toLowerCase()
        return (
          !query ||
          option.handle.toLowerCase().includes(query) ||
          option.displayName.toLowerCase().includes(query)
        )
      })
    : []

  const refreshOutbox = async () => {
    const items = await readOutbox()
    setOutboxCount(items.filter((item) => item.roomId === roomId).length)
  }

  useEffect(() => {
    void refreshOutbox()
    const flush = async () => {
      if (!navigator.onLine) return
      const result = await flushOutbox()
      if (result.sent) await refreshOutbox()
    }
    void flush()
    const onOnline = () => void flush()
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "0px"
    const max = compact ? 160 : 220
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 40), max)}px`
  }, [value, compact])

  function updateMention(nextValue: string, caret: number) {
    const before = nextValue.slice(0, caret)
    const match = /(^|[\s(])@([a-zA-Z0-9_-]*)$/.exec(before)
    if (!match) {
      setMention(null)
      return
    }
    setMention({
      start: caret - (match[2]?.length ?? 0) - 1,
      end: caret,
      query: match[2] ?? "",
      index: 0,
    })
  }

  function insertMention(handle: string) {
    if (!mention) return
    const next = `${value.slice(0, mention.start)}@${handle} ${value.slice(mention.end)}`
    setValue(next)
    setMention(null)
    requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      const caret = mention.start + handle.length + 2
      textarea.focus()
      textarea.setSelectionRange(caret, caret)
    })
  }

  async function queueOffline(content: string) {
    const id = crypto.randomUUID()
    await enqueueOutbox({
      id,
      orgSlug,
      roomId,
      content,
      threadRootId,
      createdAt: new Date().toISOString(),
    })
    await refreshOutbox()
    setNotice("Written offline. It sends when the connection returns.")
  }

  async function send() {
    const content = value.trim()
    if (!content || pending) return
    setError(null)
    setNotice(null)
    setPending(true)
    if (!navigator.onLine) {
      try {
        await queueOffline(content)
        setValue((current) => (current.trim() === content ? "" : current))
      } catch {
        setError("Could not write to the offline queue in this browser.")
      } finally {
        setPending(false)
      }
      return
    }
    try {
      const result = await sendMessage({ orgSlug, roomId, content, threadRootId })
      if (!result.ok) {
        setError(result.error ?? "Message could not be sent")
      } else {
        setValue((current) => (current.trim() === content ? "" : current))
        if (result.warning) setNotice(result.warning)
        onSent?.()
      }
    } catch {
      try {
        await queueOffline(content)
        setValue((current) => (current.trim() === content ? "" : current))
      } catch {
        setError("Connection lost and the offline queue is unavailable.")
      }
    } finally {
      setPending(false)
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return
    if (mention && options.length) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setMention({ ...mention, index: (mention.index + 1) % options.length })
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setMention({ ...mention, index: (mention.index - 1 + options.length) % options.length })
        return
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        const option = options[mention.index]
        if (option) insertMention(option.handle)
        return
      }
      if (event.key === "Escape") {
        setMention(null)
        return
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <div className={cn("relative", compact ? "px-3 pb-3" : "px-4 pb-4")}>
      {mention && options.length ? (
        <div
          className="absolute bottom-full left-3 z-10 mb-1 max-h-56 w-72 overflow-y-auto rounded-sm border border-line-strong bg-panel py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
          id="mention-options"
          role="listbox"
          aria-label="Mention an agent"
        >
          <p className="px-2 py-1 font-mono text-[10px] text-faint">agents</p>
          {options.map((option, index) => (
            <button
              key={option.handle}
              type="button"
              role="option"
              aria-selected={index === mention.index}
              onMouseDown={(event) => {
                event.preventDefault()
                insertMention(option.handle)
              }}
              className={cn(
                "flex w-full items-baseline justify-between gap-3 px-2 py-1.5 text-left",
                index === mention.index ? "bg-raised text-text" : "text-muted hover:bg-raised",
              )}
            >
              <span className="font-mono text-[12px]">@{option.handle}</span>
              <span className="truncate text-[11px] text-faint">{option.displayName}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-md border border-line bg-panel focus-within:border-line-strong">
        <label htmlFor={`composer-${threadRootId ?? "main"}`} className="sr-only">
          {placeholder}
        </label>
        <textarea
          id={`composer-${threadRootId ?? "main"}`}
          data-testid="composer"
          aria-autocomplete="list"
          aria-expanded={Boolean(mention && options.length)}
          aria-controls="mention-options"
          ref={textareaRef}
          value={value}
          autoFocus={autoFocus}
          rows={1}
          maxLength={100_000}
          spellCheck
          placeholder={placeholder}
          onChange={(event) => {
            const next = event.target.value
            setValue(next)
            updateMention(next, event.target.selectionStart ?? next.length)
            onTyping?.()
          }}
          onSelect={(event) =>
            updateMention(event.currentTarget.value, event.currentTarget.selectionStart ?? 0)
          }
          onKeyDown={onKeyDown}
          onBlur={() => window.setTimeout(() => setMention(null), 120)}
          className="block max-h-[220px] min-h-10 w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] leading-relaxed text-text outline-none placeholder:text-faint"
        />
        <div className="flex flex-wrap items-center gap-2 px-2.5 pb-2">
          <details className="relative">
            <summary
              className="grid h-6 w-6 cursor-pointer list-none place-items-center rounded-sm border border-line font-mono text-[13px] text-muted hover:border-line-strong hover:text-text"
              aria-label="More actions"
              title="More actions"
            >
              +
            </summary>
            <div className="absolute bottom-full left-0 z-10 mb-1 w-48 border border-line-strong bg-panel py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
              <Link
                href={`/${orgSlug}/meetings`}
                className="block px-3 py-1.5 text-[12px] text-muted hover:bg-raised hover:text-text"
              >
                Start a meeting
              </Link>
              <Link
                href={`/${orgSlug}/tasks`}
                className="block px-3 py-1.5 text-[12px] text-muted hover:bg-raised hover:text-text"
              >
                New task or request
              </Link>
              <Link
                href={`/${orgSlug}/files`}
                className="block px-3 py-1.5 text-[12px] text-muted hover:bg-raised hover:text-text"
              >
                Browse files
              </Link>
            </div>
          </details>
          <span className="font-mono text-[10px] text-faint">
            <Kbd>@</Kbd> agent · <Kbd>Enter</Kbd> send · <Kbd>Shift</Kbd>+
            <Kbd>Enter</Kbd> newline
          </span>
          <div className="ml-auto flex items-center gap-2">
            {value.length > 90_000 ? (
              <span className="font-mono text-[10px] text-warn">{value.length}/100000</span>
            ) : null}
            <Button
              size="sm"
              variant="primary"
              data-testid="send-message"
              onClick={() => void send()}
              disabled={pending || !value.trim()}
            >
              <SendIcon width={14} height={14} />
              {pending ? "sending" : "send"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        {error ? (
          <p role="alert" className="text-[12px] text-danger">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-[12px] text-warn">
            {notice}
          </p>
        ) : null}
        {outboxCount > 0 ? (
          <p className="font-mono text-[10px] text-faint">
            {outboxCount} {outboxCount === 1 ? "message" : "messages"} queued offline
          </p>
        ) : null}
      </div>
    </div>
  )
}
