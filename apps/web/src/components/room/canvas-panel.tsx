"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Group, Panel, Separator } from "react-resizable-panels"
import { CanvasEditor } from "@/components/room/canvas-editor"
import { CanvasVersions } from "@/components/room/canvas-versions"
import { CreateCanvasForm } from "@/components/room/create-canvas-form"
import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty"
import { PlusIcon } from "@/components/ui/icons"
import { cn } from "@/lib/format"
import type { CanvasView } from "@/lib/types"

type CanvasConnection = "connecting" | "connected" | "synced" | "disconnected" | "denied"

function connectionLabel(status: CanvasConnection): string {
  if (status === "synced") return "synced"
  if (status === "connected") return "syncing"
  if (status === "denied") return "denied"
  if (status === "disconnected") return "offline"
  return "connecting"
}

export function CanvasPanel({
  canvases,
  orgSlug,
  roomId,
  userName,
}: {
  canvases: CanvasView[]
  orgSlug: string
  roomId: string
  userName: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(canvases[0]?.id ?? null)
  const [showCreate, setShowCreate] = useState(canvases.length === 0)
  const pendingSelection = useRef<string | null>(null)
  const [text, setText] = useState("")
  const [connection, setConnection] = useState<CanvasConnection>("connecting")

  const selected = useMemo(
    () => canvases.find((canvas) => canvas.id === selectedId) ?? canvases[0] ?? null,
    [canvases, selectedId],
  )

  useEffect(() => {
    if (selectedId && canvases.some((canvas) => canvas.id === selectedId)) {
      pendingSelection.current = null
      return
    }
    if (selectedId && pendingSelection.current === selectedId) return
    setSelectedId(canvases[0]?.id ?? null)
  }, [canvases, selectedId])

  useEffect(() => {
    setText(selected?.snapshotText ?? "")
    setConnection("connecting")
  }, [selected?.id, selected?.snapshotText])

  const onText = useCallback((next: string) => setText(next), [])
  const onConnection = useCallback((next: CanvasConnection) => setConnection(next), [])
  const onCreated = useCallback((canvasId: string) => {
    pendingSelection.current = canvasId
    setSelectedId(canvasId)
    setShowCreate(false)
  }, [])

  return (
    <section className="flex h-full min-h-0 flex-col bg-void" aria-label="Room canvas">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-ink px-3 py-2">
        <span className="font-mono text-[10px] text-faint">canvas</span>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {canvases.map((canvas) => (
            <button
              key={canvas.id}
              type="button"
              onClick={() => setSelectedId(canvas.id)}
              aria-pressed={selected?.id === canvas.id}
              className={cn(
                "flex shrink-0 items-baseline gap-2 rounded-sm px-2 py-1 text-[12px] transition-colors",
                selected?.id === canvas.id
                  ? "bg-raised text-text"
                  : "text-muted hover:bg-raised hover:text-text",
              )}
            >
              {canvas.title}
              <span className="font-mono text-[9px] text-faint">{canvas.kind}</span>
            </button>
          ))}
        </div>
        {selected ? (
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[10px] text-faint"
            title={`Canvas connection: ${connectionLabel(connection)}`}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5",
                connection === "synced"
                  ? "bg-[var(--color-ok)]"
                  : connection === "denied" || connection === "disconnected"
                    ? "bg-[var(--color-danger)]"
                    : "bg-[var(--color-warn)]",
              )}
            />
            {connectionLabel(connection)}
          </span>
        ) : null}
        {selected ? (
          <CanvasVersions canvasId={selected.id} orgSlug={orgSlug} roomId={roomId} />
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreate((open) => !open)}
          aria-expanded={showCreate}
        >
          <PlusIcon width={13} height={13} />
          new
        </Button>
      </div>

      {showCreate ? (
        <CreateCanvasForm orgSlug={orgSlug} roomId={roomId} onCreated={onCreated} />
      ) : null}

      {!selected ? (
        <div className="flex-1 p-6">
          <EmptyState
            title="No canvas yet"
            body="A canvas is a shared Yjs document. Agents can write to it or patch it with search and replace while humans type in the same document."
            action={
              !showCreate ? (
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  Add a canvas
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          {selected.kind === "code" ? (
            <CanvasEditor
              key={selected.id}
              canvas={selected}
              userName={userName}
              onText={onText}
              onConnection={onConnection}
            />
          ) : (
            <Group
              orientation="vertical"
              id={`canvas-split-${selected.id}`}
              className="h-full min-h-0"
            >
              <Panel defaultSize="62%" minSize="160px" className="min-h-0 overflow-hidden">
                <CanvasEditor
                  key={selected.id}
                  canvas={selected}
                  userName={userName}
                  onText={onText}
                  onConnection={onConnection}
                />
              </Panel>
              <Separator className="h-px bg-line hover:bg-line-strong" />
              <Panel defaultSize="38%" minSize="120px" className="min-h-0 overflow-hidden">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex items-center justify-between border-b border-line bg-panel px-3 py-1">
                    <span className="font-mono text-[10px] text-faint">
                      preview · sandboxed
                    </span>
                    <span className="font-mono text-[10px] text-faint">
                      {text.length} chars
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {selected.kind === "markdown" ? (
                      <div className="h-full overflow-auto bg-void p-4">
                        {text.trim() ? (
                          <Markdown content={text} />
                        ) : (
                          <p className="font-mono text-[11px] text-faint">
                            Empty canvas. Write in the editor; the preview follows the shared
                            document.
                          </p>
                        )}
                      </div>
                    ) : (
                      <iframe
                        title={`${selected.title} preview`}
                        sandbox="allow-scripts"
                        srcDoc={text}
                        className="h-full w-full border-0 bg-white"
                      />
                    )}
                  </div>
                </div>
              </Panel>
            </Group>
          )}
        </div>
      )}
    </section>
  )
}
