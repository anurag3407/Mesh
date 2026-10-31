"use client"

import { useRef, useState, useTransition } from "react"
import { restoreCanvasVersion } from "@/lib/actions/canvas"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { HistoryIcon } from "@/components/ui/icons"
import { InlineAlert } from "@/components/ui/empty"
import { fullTime, pretty, truncate } from "@/lib/format"
import type { CanvasVersionView } from "@/lib/types"

export function CanvasVersions({
  canvasId,
  orgSlug,
  roomId,
}: {
  canvasId: string
  orgSlug: string
  roomId: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [versions, setVersions] = useState<CanvasVersionView[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function open() {
    dialogRef.current?.showModal()
    setLoading(true)
    setError(null)
    setMessage(null)
    const supabase = createSupabaseBrowserClient()
    const { data, error: fetchError } = await supabase
      .from("canvas_versions")
      .select("id, canvas_id, author_type, author_id, snapshot_text, created_at")
      .eq("canvas_id", canvasId)
      .order("created_at", { ascending: false })
      .limit(30)
    if (fetchError) setError(fetchError.message)
    else
      setVersions(
        (data ?? []).map((row) => ({
          id: row.id,
          canvasId: row.canvas_id,
          authorType: row.author_type,
          authorId: row.author_id,
          snapshotText: row.snapshot_text,
          createdAt: row.created_at,
        })),
      )
    setLoading(false)
  }

  function restore(version: CanvasVersionView) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await restoreCanvasVersion({ orgSlug, roomId, versionId: version.id })
      if (!result.ok) setError(result.error ?? "Could not restore this version")
      else setMessage(`Restored the version from ${fullTime(version.createdAt)}`)
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => void open()} title="Canvas versions">
        <HistoryIcon width={14} height={14} />
        versions
      </Button>
      <dialog
        ref={dialogRef}
        className="m-auto max-h-[82vh] w-[min(680px,92vw)] overflow-hidden rounded-md border border-line-strong bg-panel p-0 text-text backdrop:bg-void/75"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close()
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[15px] font-medium">Canvas versions</h2>
            <p className="mt-0.5 font-mono text-[10px] text-faint">
              agent edits and restores are recorded
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => dialogRef.current?.close()}>
            close
          </Button>
        </div>
        <div className="max-h-[64vh] overflow-y-auto p-4">
          {loading ? <p className="font-mono text-[11px] text-faint">loading versions…</p> : null}
          {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
          {message ? <InlineAlert tone="success">{message}</InlineAlert> : null}
          {!loading && !versions.length ? (
            <p className="max-w-md text-[13px] leading-relaxed text-muted">
              No versions yet. The first version appears after an agent writes or patches this
              canvas, or after a restore.
            </p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {versions.map((version) => (
              <li key={version.id} className="rounded-sm border border-line bg-ink">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="font-mono text-[11px] text-text">
                    {version.authorType === "agent" ? "agent" : "human"}
                  </span>
                  <span className="font-mono text-[10px] text-faint">
                    {fullTime(version.createdAt)}
                  </span>
                  <span className="font-mono text-[10px] text-faint">
                    {version.snapshotText.length} chars
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-7"
                    disabled={pending}
                    onClick={() => restore(version)}
                  >
                    restore
                  </Button>
                </div>
                <details>
                  <summary className="cursor-pointer border-t border-line px-3 py-1.5 font-mono text-[10px] text-muted hover:text-text">
                    preview
                  </summary>
                  <pre className="max-h-52 overflow-auto border-t border-line px-3 py-2 font-mono text-[11px] leading-relaxed text-muted">
                    {truncate(pretty(version.snapshotText), 4_000)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  )
}
