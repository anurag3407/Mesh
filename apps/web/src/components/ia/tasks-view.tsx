"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import {
  addTaskCommentAction,
  answerTaskRequestAction,
  createTaskAction,
  updateTaskAction,
} from "@/lib/actions/tasks"
import { Button } from "@/components/ui/button"
import { Field, Input, Select, Textarea } from "@/components/ui/field"
import { EmptyState, InlineAlert } from "@/components/ui/empty"
import { StatusBadge } from "@/components/ui/status"
import { cn } from "@/lib/format"
import type { TaskView } from "@/lib/types"

interface TaskRoom {
  id: string
  name: string
}

interface TaskMember {
  userId: string
  displayName: string
}

interface TaskAgent {
  id: string
  handle: string
  displayName: string
}

const COLUMNS = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "stuck", label: "Stuck" },
  { key: "done", label: "Done" },
] as const

const STATUS_LABELS: Record<TaskView["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  stuck: "Stuck",
  done: "Done",
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function assigneeLabel(task: TaskView): string {
  if (task.assigneeHandle) return `@${task.assigneeHandle}`
  if (task.assigneeName) return task.assigneeName
  return "Unassigned"
}

function taskTone(status: TaskView["status"]): string {
  if (status === "done") return "border-l-[var(--color-ok)]"
  if (status === "stuck") return "border-l-[var(--color-danger)]"
  if (status === "in_progress") return "border-l-accent"
  return "border-l-line-strong"
}

function TaskCard({
  task,
  onOpen,
  showRoom = true,
}: {
  task: TaskView
  onOpen: (task: TaskView) => void
  showRoom?: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(task)}
        className={cn(
          "w-full border border-line border-l-2 bg-panel px-3 py-2.5 text-left transition-colors hover:bg-raised",
          taskTone(task.status),
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-faint">MESH-{task.number}</span>
          {task.kind === "request" ? (
            <span className="font-mono text-[9px] text-accent">request</span>
          ) : null}
          <span className="ml-auto font-mono text-[9px] text-faint">{shortDate(task.updatedAt)}</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-snug text-text">{task.title}</p>
        {task.description ? (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
            {task.description}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] text-faint">
          {showRoom ? <span>{task.roomName}</span> : null}
          <span>· {assigneeLabel(task)}</span>
          {task.comments.length ? <span>· {task.comments.length} comments</span> : null}
          {task.requestedByHandle ? <span>· asked by @{task.requestedByHandle}</span> : null}
        </div>
      </button>
    </li>
  )
}

function TaskDetail({
  task,
  orgSlug,
  members,
  agents,
  onClose,
  onChanged,
}: {
  task: TaskView
  orgSlug: string
  members: TaskMember[]
  agents: TaskAgent[]
  onClose: () => void
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [answer, setAnswer] = useState("")
  const [alsoPost, setAlsoPost] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  function update(input: { status?: TaskView["status"]; assignee?: string }) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await updateTaskAction({ orgSlug, taskId: task.id, ...input })
      if (!result.ok) {
        setError(result.error ?? "Could not update the task")
        return
      }
      setNotice(result.message ?? "Task updated")
      onChanged()
    })
  }

  function addComment() {
    if (!comment.trim()) return
    setError(null)
    setNotice(null)
    const form = new FormData()
    form.set("orgSlug", orgSlug)
    form.set("taskId", task.id)
    form.set("content", comment)
    startTransition(async () => {
      const result = await addTaskCommentAction(null, form)
      if (!result.ok) {
        setError(result.error ?? "Could not add the comment")
        return
      }
      setComment("")
      onChanged()
    })
  }

  function sendAnswer() {
    if (!answer.trim()) return
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await answerTaskRequestAction({
        orgSlug,
        taskId: task.id,
        answer,
        alsoPost,
      })
      if (!result.ok) {
        setError(result.error ?? "Could not send the answer")
        return
      }
      setAnswer("")
      setNotice(result.message ?? "Answer sent")
      onChanged()
    })
  }

  const assigneeValue = task.assigneeUserId
    ? `user:${task.assigneeUserId}`
    : task.assigneeAgentId
      ? `agent:${task.assigneeAgentId}`
      : ""

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-void/70"
      role="dialog"
      aria-modal="true"
      aria-label={`Task MESH-${task.number}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-line bg-ink">
        <div className="sticky top-0 flex items-center gap-2 border-b border-line bg-ink px-4 py-3">
          <span className="font-mono text-[10px] text-faint">MESH-{task.number}</span>
          <StatusBadge status={task.status} />
          <span className="rounded-sm bg-raised px-1.5 py-0.5 font-mono text-[9px] text-muted">
            {task.kind}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid h-7 w-7 place-items-center rounded-sm text-muted hover:bg-raised hover:text-text"
            aria-label="Close task"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div>
            <h2 className="text-[17px] font-medium leading-snug tracking-[-0.01em]">{task.title}</h2>
            <p className="mt-1 font-mono text-[10px] text-faint">
              {task.roomName} · updated {shortDate(task.updatedAt)} ·{" "}
              {task.requestedByHandle ? `requested by @${task.requestedByHandle}` : `by a teammate`}
            </p>
          </div>
          {task.description ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
              {task.description}
            </p>
          ) : null}

          <div className="grid gap-3 border border-line bg-panel p-3 sm:grid-cols-2">
            <Field label="status" htmlFor="task-status">
              <Select
                id="task-status"
                value={task.status}
                disabled={pending}
                onChange={(event) =>
                  update({ status: event.target.value as TaskView["status"] })
                }
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="assignee" htmlFor="task-assignee">
              <Select
                id="task-assignee"
                value={assigneeValue}
                disabled={pending}
                onChange={(event) => update({ assignee: event.target.value })}
              >
                <option value="">Unassigned</option>
                <optgroup label="People">
                  {members.map((member) => (
                    <option key={member.userId} value={`user:${member.userId}`}>
                      {member.displayName}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Agents">
                  {agents.map((agent) => (
                    <option key={agent.id} value={`agent:${agent.id}`}>
                      @{agent.handle} · {agent.displayName}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </Field>
          </div>

          {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
          {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}

          {task.kind === "request" && task.status !== "done" ? (
            <section className="border border-line border-l-2 border-l-accent bg-panel p-3">
              <h3 className="font-mono text-[10px] text-accent">answer this request</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                {task.requestedByHandle
                  ? `@${task.requestedByHandle} is waiting on a human answer.`
                  : "An agent is waiting on a human answer."}
              </p>
              <Textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                rows={3}
                className="mt-2"
                placeholder="Write the answer the agent should use."
              />
              <label className="mt-2 flex items-start gap-2 text-[11px] text-muted">
                <input
                  type="checkbox"
                  checked={alsoPost}
                  onChange={(event) => setAlsoPost(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-[var(--color-accent)]"
                />
                <span>
                  Post the answer in {task.roomName}. Unchecked delivers it as a direct message to
                  the agent.
                </span>
              </label>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={pending || !answer.trim()}
                  onClick={sendAnswer}
                >
                  {pending ? "Sending…" : "Send answer"}
                </Button>
              </div>
            </section>
          ) : null}

          <section>
            <div className="flex items-baseline justify-between">
              <h3 className="text-[13px] font-medium">Activity</h3>
              <span className="font-mono text-[10px] text-faint">
                {task.comments.length} comments
              </span>
            </div>
            {task.comments.length === 0 ? (
              <p className="mt-2 border-l-2 border-line-strong pl-3 font-mono text-[10px] text-faint">
                No comments yet. Agents can comment with their task tools.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {task.comments.map((item) => (
                  <li key={item.id} className="border-l-2 border-line pl-3">
                    <p className="font-mono text-[10px] text-faint">
                      {item.authorName} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-muted">
                      {item.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={2}
                placeholder="Add context for the room."
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || !comment.trim()}
                  onClick={addComment}
                >
                  Comment
                </Button>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3 font-mono text-[10px] text-faint">
            <Link href={`/${orgSlug}/r/${task.roomId}`} className="hover:text-text">
              open room
            </Link>
            <span>·</span>
            <span>status changes are audited</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TasksView({
  orgSlug,
  tasks,
  rooms,
  members,
  agents,
}: {
  orgSlug: string
  tasks: TaskView[]
  rooms: TaskRoom[]
  members: TaskMember[]
  agents: TaskAgent[]
}) {
  const router = useRouter()
  const [view, setView] = useState<"tasks" | "requests">("tasks")
  const [showNew, setShowNew] = useState(false)
  const [newKind, setNewKind] = useState<"task" | "request">("task")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [roomFilter, setRoomFilter] = useState("")
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selected = tasks.find((task) => task.id === selectedId) ?? null
  const requests = tasks.filter((task) => task.kind === "request")
  const boardTasks = tasks.filter((task) => task.kind === "task")
  const openRequests = requests.filter((task) => task.status !== "done")
  const doneRequests = requests.filter((task) => task.status === "done")

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return boardTasks.filter((task) => {
      if (roomFilter && task.roomId !== roomFilter) return false
      if (!needle) return true
      return (
        task.title.toLowerCase().includes(needle) ||
        task.description.toLowerCase().includes(needle) ||
        String(task.number).includes(needle)
      )
    })
  }, [boardTasks, roomFilter, query])

  function create(form: FormData) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await createTaskAction(null, form)
      if (!result.ok) {
        setError(result.error ?? "Could not create the item")
        return
      }
      setNotice(result.message ?? "Created")
      setShowNew(false)
      router.refresh()
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="font-mono text-[11px] text-faint">workspace</p>
            <h1 className="mt-1 text-2xl font-medium tracking-[-0.02em]">Tasks</h1>
            <p className="mt-1.5 font-mono text-[11px] text-muted">
              {boardTasks.filter((task) => task.status !== "done").length} open tasks ·{" "}
              {openRequests.length} requests waiting · {doneRequests.length} answered
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setNewKind(view === "requests" ? "request" : "task")
              setShowNew((open) => !open)
            }}
          >
            {showNew ? "Close" : view === "requests" ? "+ New request" : "+ New task"}
          </Button>
        </header>

        {error ? (
          <div className="mt-4">
            <InlineAlert tone="danger">{error}</InlineAlert>
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4">
            <InlineAlert tone="success">{notice}</InlineAlert>
          </div>
        ) : null}

        {showNew ? (
          <form action={create} className="mt-5 border border-line bg-panel p-4 sm:p-5">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
              <Field label="title" htmlFor="new-task-title">
                <Input
                  id="new-task-title"
                  name="title"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Draft the migration checklist"
                />
              </Field>
              <Field label="type" htmlFor="new-task-kind">
                <Select
                  id="new-task-kind"
                  name="kind"
                  value={newKind}
                  onChange={(event) => setNewKind(event.target.value as "task" | "request")}
                >
                  <option value="task">Task</option>
                  <option value="request">Request from an agent</option>
                </Select>
              </Field>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="room" htmlFor="new-task-room">
                <Select id="new-task-room" name="roomId" required defaultValue="">
                  <option value="" disabled>
                    Choose a room
                  </option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="assignee" htmlFor="new-task-assignee" hint="must be in the room">
                <Select id="new-task-assignee" name="assignee" defaultValue="">
                  <option value="">Unassigned</option>
                  <optgroup label="People">
                    {members.map((member) => (
                      <option key={member.userId} value={`user:${member.userId}`}>
                        {member.displayName}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Agents">
                    {agents.map((agent) => (
                      <option key={agent.id} value={`agent:${agent.id}`}>
                        @{agent.handle} · {agent.displayName}
                      </option>
                    ))}
                  </optgroup>
                </Select>
              </Field>
            </div>
            <div className="mt-3">
              <Field label="description" htmlFor="new-task-description" hint="optional">
                <Textarea
                  id="new-task-description"
                  name="description"
                  rows={3}
                  placeholder="Context, acceptance criteria, links to the thread."
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit" variant="primary" disabled={pending || rooms.length === 0}>
                {pending ? "Creating…" : newKind === "request" ? "Create request" : "Create task"}
              </Button>
            </div>
          </form>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-line">
          <div className="flex gap-1">
            {(
              [
                { key: "tasks", label: "Tasks", count: boardTasks.filter((t) => t.status !== "done").length },
                { key: "requests", label: "Requests", count: openRequests.length },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setView(option.key)}
                aria-pressed={view === option.key}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-[11px]",
                  view === option.key
                    ? "border-accent text-text"
                    : "border-transparent text-muted hover:text-text",
                )}
              >
                {option.label}
                {option.count ? <span className="text-faint">{option.count}</span> : null}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 pb-1">
            <Select
              value={roomFilter}
              onChange={(event) => setRoomFilter(event.target.value)}
              className="h-7 w-auto font-mono text-[10px]"
              aria-label="Filter by room"
            >
              <option value="">All rooms</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
            <label className="flex h-7 min-w-[10rem] items-center rounded-sm border border-line bg-panel px-2 focus-within:border-accent">
              <span className="sr-only">Search tasks</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="w-full bg-transparent font-mono text-[10px] text-text outline-none placeholder:text-faint"
              />
            </label>
          </div>
        </div>

        {view === "tasks" ? (
          filtered.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No tasks match"
                body="Create a task and assign it to a person or an agent. Agents can create tasks too."
                action={
                  <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>
                    New task
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {COLUMNS.map((column) => {
                const items = filtered.filter((task) => task.status === column.key)
                return (
                  <section key={column.key} aria-labelledby={`column-${column.key}`}>
                    <div className="flex items-baseline justify-between border-b border-line pb-2">
                      <h2
                        id={`column-${column.key}`}
                        className="font-mono text-[10px] uppercase tracking-wide text-muted"
                      >
                        {column.label}
                      </h2>
                      <span className="font-mono text-[10px] text-faint">{items.length}</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="mt-3 border border-dashed border-line px-3 py-4 font-mono text-[10px] text-faint">
                        nothing here
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {items.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onOpen={(item) => setSelectedId(item.id)}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          )
        ) : (
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_320px]">
            <section>
              <div className="flex items-baseline justify-between border-b border-line pb-2">
                <h2 className="font-mono text-[10px] uppercase tracking-wide text-muted">
                  Waiting on a human
                </h2>
                <span className="font-mono text-[10px] text-faint">{openRequests.length}</span>
              </div>
              {openRequests.length === 0 ? (
                <p className="mt-4 border-l-2 border-line-strong pl-3 font-mono text-[11px] leading-relaxed text-faint">
                  No open requests. Agents create one when they need a decision a tool cannot make.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {openRequests.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onOpen={(item) => setSelectedId(item.id)}
                    />
                  ))}
                </ul>
              )}
            </section>
            <aside className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <div className="flex items-baseline justify-between border-b border-line pb-2">
                <h2 className="font-mono text-[10px] uppercase tracking-wide text-muted">
                  Answered
                </h2>
                <span className="font-mono text-[10px] text-faint">{doneRequests.length}</span>
              </div>
              {doneRequests.length === 0 ? (
                <p className="mt-4 font-mono text-[10px] text-faint">No answered requests yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {doneRequests.slice(0, 8).map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(task.id)}
                        className="w-full border border-line bg-panel px-3 py-2 text-left hover:bg-raised"
                      >
                        <p className="truncate text-[12px] text-muted">{task.title}</p>
                        <p className="mt-0.5 font-mono text-[9px] text-faint">
                          {task.roomName} · {shortDate(task.updatedAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 font-mono text-[10px] leading-relaxed text-faint">
                Answers can post in the room or go to the agent&apos;s direct chat. Either way the
                agent gets a turn.
              </p>
            </aside>
          </div>
        )}

        <p className="mt-10 font-mono text-[10px] leading-relaxed text-faint">
          Task numbers are scoped to the workspace. Changing a status or assignee is audited.
        </p>
      </div>

      {selected ? (
        <TaskDetail
          task={selected}
          orgSlug={orgSlug}
          members={members}
          agents={agents}
          onClose={() => setSelectedId(null)}
          onChanged={() => router.refresh()}
        />
      ) : null}
    </div>
  )
}
