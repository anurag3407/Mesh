"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { EmptyState } from "@/components/ui/empty"
import { cn } from "@/lib/format"
import type { FileView } from "@/lib/types"

interface FileRoom {
  id: string
  name: string
}

const KIND_LABELS: Record<FileView["kind"], string> = {
  markdown: "markdown",
  code: "code",
  svg: "svg",
  html: "html",
}

function fileMark(kind: FileView["kind"]): string {
  if (kind === "code") return "{ }"
  if (kind === "svg") return "△"
  if (kind === "html") return "<>"
  return "#"
}

function updatedLabel(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function FilesView({
  orgSlug,
  files,
  rooms,
}: {
  orgSlug: string
  files: FileView[]
  rooms: FileRoom[]
}) {
  const [kind, setKind] = useState<"all" | FileView["kind"]>("all")
  const [roomId, setRoomId] = useState("")
  const [query, setQuery] = useState("")

  const counts = {
    all: files.length,
    markdown: files.filter((file) => file.kind === "markdown").length,
    code: files.filter((file) => file.kind === "code").length,
    svg: files.filter((file) => file.kind === "svg").length,
    html: files.filter((file) => file.kind === "html").length,
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return files.filter((file) => {
      if (kind !== "all" && file.kind !== kind) return false
      if (roomId && file.roomId !== roomId) return false
      if (!needle) return true
      return (
        file.title.toLowerCase().includes(needle) ||
        file.preview.toLowerCase().includes(needle) ||
        file.roomName.toLowerCase().includes(needle)
      )
    })
  }, [files, kind, roomId, query])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <header className="border-b border-line pb-5">
          <p className="font-mono text-[11px] text-faint">workspace</p>
          <h1 className="mt-1 text-2xl font-medium tracking-[-0.02em]">Files</h1>
          <p className="mt-1.5 max-w-[64ch] font-mono text-[11px] leading-relaxed text-muted">
            Every room canvas is a live file: markdown notes, code, SVG and HTML previews. Humans
            and agents edit the same document; versions are kept server-side.
          </p>
        </header>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter files">
            {(["all", "markdown", "code", "svg", "html"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                aria-pressed={kind === option}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 font-mono text-[10px]",
                  kind === option
                    ? "bg-raised text-text"
                    : "text-muted hover:bg-raised/60 hover:text-text",
                )}
              >
                {option === "all" ? "All" : KIND_LABELS[option]}
                <span className="text-faint">{counts[option]}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              aria-label="Filter files by room"
              className="h-8 rounded-sm border border-line bg-panel px-2 font-mono text-[10px] text-text outline-none focus:border-accent"
            >
              <option value="">All rooms</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <label className="flex h-8 min-w-[11rem] items-center rounded-sm border border-line bg-panel px-2.5 focus-within:border-accent">
              <span className="sr-only">Search files</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles and content"
                className="w-full bg-transparent text-[12px] text-text outline-none placeholder:text-faint"
              />
            </label>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={files.length === 0 ? "No files yet" : "No files match"}
              body={
                files.length === 0
                  ? "Open a room and create a canvas. Every canvas shows up here with its latest snapshot."
                  : "Try another kind, room or search phrase."
              }
            />
          </div>
        ) : (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {filtered.map((file) => (
              <li key={file.id}>
                <Link
                  href={`/${orgSlug}/r/${file.roomId}?canvas=${file.id}`}
                  className="group flex h-full flex-col border border-line bg-panel p-4 transition-colors hover:border-line-strong hover:bg-raised"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-line bg-ink font-mono text-[10px] text-accent"
                    >
                      {fileMark(file.kind)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-text">{file.title}</p>
                      <p className="mt-0.5 font-mono text-[9px] text-faint">
                        {KIND_LABELS[file.kind]}
                        {file.language ? ` · ${file.language}` : ""} · {file.roomName}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[9px] text-faint">
                      {updatedLabel(file.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 flex-1 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted">
                    {file.preview || "Empty file"}
                  </p>
                  <span className="mt-3 font-mono text-[10px] text-faint group-hover:text-accent">
                    open in room →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 font-mono text-[10px] leading-relaxed text-faint">
          Files are scoped to rooms and follow room membership. Agent edits are attributed in the
          canvas version history.
        </p>
      </div>
    </div>
  )
}
