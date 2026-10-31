"use client"

import { useTransition, useState } from "react"
import { resolveToolCall } from "@/lib/actions/messages"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/copy-button"
import { StatusBadge } from "@/components/ui/status"
import { clockTime, pretty } from "@/lib/format"
import { CheckIcon, CloseIcon } from "@/components/ui/icons"
import type { ToolCallView } from "@/lib/types"

export function ApprovalCard({
  call,
  orgSlug,
  canApprove,
}: {
  call: ToolCallView
  orgSlug: string
  canApprove: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function decide(decision: "approved" | "rejected") {
    setError(null)
    startTransition(async () => {
      const result = await resolveToolCall({
        orgSlug,
        toolCallId: call.id,
        decision,
      })
      if (!result.ok) setError(result.error ?? "Could not resolve the approval")
    })
  }

  return (
    <section
      aria-label={`Approval required for ${call.toolName}`}
      data-testid="approval-card"
      data-tool-call-id={call.id}
      data-status={call.status}
      className="rounded-sm border border-line border-l-2 border-l-[var(--color-accent)] bg-panel"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <span className="font-mono text-[11px] text-accent">approval required</span>
        <span className="font-mono text-[12px] text-text">{call.toolName}</span>
        <StatusBadge status={call.status} />
        <span className="ml-auto font-mono text-[10px] text-faint">{clockTime(call.createdAt)}</span>
      </div>
      <div className="space-y-3 px-3 py-3">
        <div>
          <p className="mb-1 font-mono text-[10px] text-faint">arguments</p>
          <pre className="max-h-44 overflow-auto rounded-sm border border-line bg-ink p-2 font-mono text-[11px] leading-relaxed text-muted">
            {pretty(call.args)}
          </pre>
        </div>
        {call.status === "pending_approval" ? (
          canApprove ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                data-testid="approve-tool"
                disabled={pending}
                onClick={() => decide("approved")}
              >
                <CheckIcon width={14} height={14} />
                {pending ? "Saving…" : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="danger"
                data-testid="reject-tool"
                disabled={pending}
                onClick={() => decide("rejected")}
              >
                <CloseIcon width={14} height={14} />
                Reject
              </Button>
              <span className="font-mono text-[10px] text-faint">admins only, 5 min timeout</span>
            </div>
          ) : (
            <p className="font-mono text-[11px] text-warn">
              Waiting for a room or org admin. This request expires in 5 minutes.
            </p>
          )
        ) : (
          <p className="font-mono text-[11px] text-muted">
            decision: {call.status}
            {call.resolvedAt ? ` · ${clockTime(call.resolvedAt)}` : ""}
          </p>
        )}
        {error ? (
          <p role="alert" className="text-[12px] text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export function ToolCallCard({ call }: { call: ToolCallView }) {
  const resultText = call.result === null || call.result === undefined ? "" : pretty(call.result)
  return (
    <details
      className="group rounded-sm border border-line bg-panel/60"
      data-testid="tool-call"
      data-tool-call-id={call.id}
      data-status={call.status}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-1.5 hover:bg-raised">
        <span className="font-mono text-[11px] text-text">{call.toolName}</span>
        <StatusBadge status={call.status} />
        <span className="ml-auto font-mono text-[10px] text-faint">
          {clockTime(call.createdAt)}
        </span>
      </summary>
      <div className="border-t border-line px-3 py-2.5">
        <p className="mb-1 font-mono text-[10px] text-faint">arguments</p>
        <pre className="max-h-40 overflow-auto rounded-sm border border-line bg-ink p-2 font-mono text-[11px] leading-relaxed text-muted">
          {pretty(call.args)}
        </pre>
        {call.error ? (
          <p role="alert" className="mt-2 text-[12px] text-danger">
            {call.error}
          </p>
        ) : null}
        {resultText ? (
          <>
            <div className="mt-3 flex items-center justify-between">
              <p className="font-mono text-[10px] text-faint">result</p>
              <CopyButton text={resultText} />
            </div>
            <pre className="mt-1 max-h-64 overflow-auto rounded-sm border border-line bg-ink p-2 font-mono text-[11px] leading-relaxed text-muted">
              {resultText}
            </pre>
          </>
        ) : null}
      </div>
    </details>
  )
}

export function ToolCallsList({
  calls,
  orgSlug,
  canApprove,
}: {
  calls: ToolCallView[]
  orgSlug: string
  canApprove: boolean
}) {
  if (!calls.length) return null
  return (
    <div className="mt-3 space-y-2">
      {calls.map((call) =>
        call.status === "pending_approval" ? (
          <ApprovalCard key={call.id} call={call} orgSlug={orgSlug} canApprove={canApprove} />
        ) : (
          <ToolCallCard key={call.id} call={call} />
        ),
      )}
    </div>
  )
}
