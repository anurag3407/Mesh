"use client"

import { Avatar } from "@/components/ui/avatar"
import { CopyButton } from "@/components/copy-button"
import { Markdown } from "@/components/markdown"
import { InlineAlert } from "@/components/ui/empty"
import { ReplyIcon } from "@/components/ui/icons"
import { ToolCallsList } from "@/components/room/tool-call-card"
import { clockTime, cn, fullTime } from "@/lib/format"
import type { MessageView, ToolCallView } from "@/lib/types"

export function MessageItem({
  message,
  toolCalls,
  orgSlug,
  canAdmin,
  threadReplyCount,
  onOpenThread,
  inThread = false,
  avatarUrl = null,
}: {
  message: MessageView
  toolCalls: ToolCallView[]
  orgSlug: string
  canAdmin: boolean
  threadReplyCount?: number
  onOpenThread?: (message: MessageView) => void
  inThread?: boolean
  avatarUrl?: string | null
}) {
  if (message.senderType === "system") {
    return (
      <div
        className={cn(
          "border-y border-line bg-panel px-4 py-3",
          message.status === "halted" && "border-l-2 border-l-[var(--color-accent)]",
        )}
        role="status"
        data-testid="system-message"
        data-status={message.status}
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-mono text-[10px] text-accent">system</span>
          <span className="font-mono text-[10px] text-faint" title={fullTime(message.createdAt)}>
            {clockTime(message.createdAt)}
          </span>
          {message.status === "halted" ? (
            <span className="font-mono text-[10px] text-accent">halted</span>
          ) : null}
        </div>
        <div className="mt-1 text-[13px] leading-relaxed text-muted">
          <Markdown content={message.content} />
        </div>
      </div>
    )
  }

  const isAgent = message.senderType === "agent"
  const error = typeof message.metadata.error === "string" ? message.metadata.error : null
  const warnings = Array.isArray(message.metadata.warnings)
    ? (message.metadata.warnings as string[])
    : []
  const relatedCalls = toolCalls.filter(
    (call) =>
      call.messageId === message.id ||
      (message.runId !== null && call.runId === message.runId && call.messageId === null),
  )
  const streaming = message.status === "streaming"

  return (
    <article
      className={cn(
        "group relative grid grid-cols-[28px_minmax(0,1fr)] gap-3 px-4 py-3 transition-colors hover:bg-raised/40",
        inThread && "px-3",
      )}
      aria-label={`${message.senderName} ${isAgent ? "agent" : "human"} message`}
      data-testid="message"
      data-sender-type={message.senderType}
      data-sender-handle={message.senderHandle ?? message.senderName}
      data-status={message.status}
    >
      <div className="pt-0.5">
        <Avatar
          name={message.senderName}
          kind={message.senderType}
          size="sm"
          src={avatarUrl}
          className="mt-0.5"
        />
      </div>
      <div className="min-w-0">
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[13px] font-medium text-text">{message.senderName}</span>
          {isAgent && message.senderHandle ? (
            <span className="font-mono text-[10px] text-muted">@{message.senderHandle}</span>
          ) : null}
          {inThread ? (
            <span className="font-mono text-[9px] text-faint">thread reply</span>
          ) : null}
          <time
            dateTime={message.createdAt}
            title={fullTime(message.createdAt)}
            className="font-mono text-[10px] text-faint"
          >
            {clockTime(message.createdAt)}
          </time>
          {streaming ? (
            <span className="font-mono text-[9px] text-accent">live</span>
          ) : message.status === "halted" ? (
            <span className="font-mono text-[9px] text-warn">stopped</span>
          ) : message.status === "error" ? (
            <span className="font-mono text-[9px] text-danger">error</span>
          ) : null}
          <span className="ml-auto flex items-center gap-3 opacity-100 transition-opacity md:opacity-0 md:focus-within:opacity-100 md:group-hover:opacity-100">
            <CopyButton text={message.content} />
            {!inThread && onOpenThread ? (
              <button
                type="button"
                onClick={() => onOpenThread(message)}
                className="inline-flex items-center gap-1 font-mono text-[10px] text-faint hover:text-text"
              >
                <ReplyIcon width={12} height={12} /> reply
              </button>
            ) : null}
          </span>
        </header>

        {message.content ? (
          <div className="mt-1.5">
            <Markdown content={message.content} streaming={streaming} />
            {streaming ? <span className="streaming-caret" aria-hidden="true" /> : null}
          </div>
        ) : streaming ? (
          <p className="mt-1.5 font-mono text-[11px] text-faint">waiting for the first token…</p>
        ) : null}

        {error ? (
          <div className="mt-2">
            <InlineAlert tone="danger">{error}</InlineAlert>
          </div>
        ) : null}
        {warnings.length ? (
          <details className="mt-2">
            <summary className="cursor-pointer font-mono text-[10px] text-warn">
              {warnings.length} tool {warnings.length === 1 ? "warning" : "warnings"}
            </summary>
            <ul className="mt-1 space-y-1 border-l border-line pl-3">
              {warnings.map((warning, index) => (
                <li key={index} className="font-mono text-[11px] leading-relaxed text-muted">
                  {warning}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <ToolCallsList calls={relatedCalls} orgSlug={orgSlug} canApprove={canAdmin} />

        {!inThread && onOpenThread && threadReplyCount !== undefined && threadReplyCount > 0 ? (
          <button
            type="button"
            onClick={() => onOpenThread(message)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-line px-2 py-1 font-mono text-[10px] text-muted hover:border-line-strong hover:text-text"
          >
            <ReplyIcon width={12} height={12} />
            {threadReplyCount} {threadReplyCount === 1 ? "reply" : "replies"}
          </button>
        ) : null}
      </div>
    </article>
  )
}
