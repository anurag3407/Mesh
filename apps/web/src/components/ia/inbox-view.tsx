"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import { answerTaskRequestAction } from "@/lib/actions/tasks"
import { ApprovalCard } from "@/components/room/tool-call-card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/field"
import { InlineAlert } from "@/components/ui/empty"
import { useWorkspaceChange } from "@/lib/use-workspace-change"
import type { InboxApprovalView, InboxDoneView, InboxRequestView } from "@/lib/types"

function when(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function RequestCard({
  item,
  orgSlug,
  onAnswered,
}: {
  item: InboxRequestView
  orgSlug: string
  onAnswered: () => void
}) {
  const [open, setOpen] = useState(false)
  const [answer, setAnswer] = useState("")
  const [alsoPost, setAlsoPost] = useState(true)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const task = item.task
  const options = Array.isArray(task.metadata.options)
    ? (task.metadata.options as unknown[]).filter((o): o is string => typeof o === "string")
    : []

  function send(value = answer) {
    if (!value.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await answerTaskRequestAction({
        orgSlug,
        taskId: task.id,
        answer: value,
        alsoPost,
      })
      if (!result.ok) {
        setError(result.error ?? "Could not send the answer")
        return
      }
      setAnswer("")
      setOpen(false)
      onAnswered()
    })
  }

  return (
    <li className="border border-line border-l-2 border-l-accent bg-panel p-4">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] text-accent">
            {task.requestedByHandle ? `@${task.requestedByHandle} asks` : "agent request"}
          </p>
          <p className="mt-1 text-[14px] leading-snug text-text">{task.title}</p>
          {task.description ? (
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12px] leading-relaxed text-muted">
              {task.description}
            </p>
          ) : null}
          <p className="mt-2 font-mono text-[11px] text-faint">
            {task.roomName} · MESH-{task.number} · {when(task.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${orgSlug}/r/${task.roomId}`}
            className="inline-flex h-8 items-center rounded-sm px-2 font-mono text-[11px] text-muted hover:text-text"
          >
            room
          </Link>
          <Button
            size="sm"
            variant={options.length ? "ghost" : "primary"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : options.length ? "Reply" : "Answer"}
          </Button>
        </div>
      </div>
      {options.length ? (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Quick answers">
          {options.map((option, index) => (
            <Button
              key={option}
              size="sm"
              variant={index === 0 ? "primary" : "secondary"}
              disabled={pending}
              onClick={() => send(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      ) : null}
      {error && !open ? (
        <p role="alert" className="mt-2 text-[12px] text-danger">
          {error}
        </p>
      ) : null}
      {open ? (
        <div className="mt-3 border-t border-line pt-3">
          <Textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={3}
            placeholder="Give the agent the decision or the missing fact."
          />
          <label className="mt-2 flex items-start gap-2 text-[12px] leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={alsoPost}
              onChange={(event) => setAlsoPost(event.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-[var(--color-accent)]"
            />
            <span>Post in {task.roomName}. Unchecked sends a direct message to the agent.</span>
          </label>
          {error ? (
            <p role="alert" className="mt-2 text-[12px] text-danger">
              {error}
            </p>
          ) : null}
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="primary" disabled={pending || !answer.trim()} onClick={() => send()}>
              {pending ? "Sending…" : "Send answer"}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function InboxView({
  orgSlug,
  approvals,
  requests,
  done,
  orgAdmin,
  adminRoomIds,
}: {
  orgSlug: string
  approvals: InboxApprovalView[]
  requests: InboxRequestView[]
  done: InboxDoneView[]
  orgAdmin: boolean
  adminRoomIds: string[]
}) {
  const router = useRouter()
  const refresh = useCallback(() => router.refresh(), [router])
  useWorkspaceChange(["tool_calls", "tasks"], refresh)
  const adminRooms = new Set(adminRoomIds)
  const canApproveAny = orgAdmin || adminRooms.size > 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <header className="border-b border-line pb-5">
          <p className="font-mono text-[12px] text-faint">workspace</p>
          <h1 className="mt-1 text-2xl font-medium tracking-[-0.02em]">Inbox</h1>
          <p className="mt-1.5 font-mono text-[12px] text-muted">
            {approvals.length} approvals · {requests.length} requests ·{" "}
            {done.length} resolved recently
          </p>
        </header>

        <div className="mt-8 space-y-10">
          <section aria-labelledby="approvals-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="approvals-heading" className="text-[15px] font-medium">
                Waiting for approval
              </h2>
              <span className="font-mono text-[11px] text-faint">agents are paused</span>
            </div>
            <p className="mt-1.5 max-w-[66ch] text-[12px] leading-relaxed text-muted">
              An agent wants to do something that changes data. It waits for a room or workspace admin
              to decide, and the request is rejected after five minutes without an answer.
            </p>
            {approvals.length === 0 ? (
              <p className="mt-3 border-l-2 border-line-strong pl-3 font-mono text-[12px] leading-relaxed text-faint">
                Nothing is blocked. Agents can keep working.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {approvals.map((item) => (
                  <li key={item.toolCall.id}>
                    <div className="mb-1.5 flex flex-wrap items-baseline gap-2 font-mono text-[11px] text-faint">
                      <span className="text-muted">{item.roomName}</span>
                      {item.agentHandle ? <span>@{item.agentHandle}</span> : null}
                      <span className="ml-auto">{when(item.toolCall.createdAt)}</span>
                    </div>
                    <ApprovalCard
                      call={item.toolCall}
                      orgSlug={orgSlug}
                      canApprove={orgAdmin || adminRooms.has(item.toolCall.roomId)}
                      agentName={item.agentName}
                      onResolved={refresh}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="requests-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="requests-heading" className="text-[15px] font-medium">
                Requests from agents
              </h2>
              <Link
                href={`/${orgSlug}/tasks`}
                className="font-mono text-[11px] text-muted hover:text-text"
              >
                all tasks
              </Link>
            </div>
            <p className="mt-1.5 max-w-[66ch] text-[12px] leading-relaxed text-muted">
              An agent needs a decision from a person. Your answer is posted under your name, and the
              agent then continues.
            </p>
            {requests.length === 0 ? (
              <p className="mt-3 border-l-2 border-line-strong pl-3 font-mono text-[12px] leading-relaxed text-faint">
                No agent is blocked on a question.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {requests.map((item) => (
                  <RequestCard
                    key={item.task.id}
                    item={item}
                    orgSlug={orgSlug}
                    onAnswered={refresh}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="resolved-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="resolved-heading" className="text-[15px] font-medium">
                Recently resolved
              </h2>
              <span className="font-mono text-[11px] text-faint">last 7 days</span>
            </div>
            {done.length === 0 ? (
              <p className="mt-3 border-l-2 border-line-strong pl-3 font-mono text-[12px] text-faint">
                Nothing resolved recently.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {done.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-baseline gap-2 py-2.5">
                    <span className="font-mono text-[11px] uppercase text-faint">{item.kind}</span>
                    <span className="text-[12px] text-muted">{item.label}</span>
                    <span className="font-mono text-[11px] text-faint">· {item.status}</span>
                    <span className="ml-auto font-mono text-[11px] text-faint">
                      {when(item.resolvedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {!canApproveAny ? (
          <div className="mt-8">
            <InlineAlert tone="neutral">
              You can read every approval here. A room or workspace admin has to decide.
            </InlineAlert>
          </div>
        ) : null}

        <p className="mt-8 font-mono text-[11px] leading-relaxed text-faint">
          The Inbox holds approvals and open requests. Mentions appear in your chat list.
        </p>
      </div>
    </div>
  )
}
