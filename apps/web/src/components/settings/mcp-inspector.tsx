"use client"

import { useState, useTransition } from "react"
import { invokeMcpTool, listMcpTools } from "@/lib/actions/mcp"
import { Button } from "@/components/ui/button"
import { Field, Select, Textarea } from "@/components/ui/field"
import { InlineAlert } from "@/components/ui/empty"
import { CopyButton } from "@/components/copy-button"
import { pretty } from "@/lib/format"

interface ToolInfo {
  name: string
  description: string
}

export function McpInspector({ orgSlug, serverId }: { orgSlug: string; serverId: string }) {
  const [tools, setTools] = useState<ToolInfo[]>([])
  const [selected, setSelected] = useState("")
  const [args, setArgs] = useState("{}")
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, startTransition] = useTransition()
  const [invoking, startInvoke] = useTransition()

  function loadTools() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      const response = await listMcpTools(orgSlug, serverId)
      if (!response.ok) {
        setError(response.error ?? "Could not list tools")
        return
      }
      const list = (response.data?.tools ?? []) as ToolInfo[]
      setTools(list)
      if (list[0]) setSelected(list[0].name)
    })
  }

  function invoke() {
    if (!selected) return
    setError(null)
    setResult(null)
    startInvoke(async () => {
      const response = await invokeMcpTool(orgSlug, serverId, selected, args)
      if (!response.ok) {
        setError(response.error ?? "Tool call failed")
        return
      }
      setResult(pretty(response.data?.content ?? null))
    })
  }

  const activeTool = tools.find((tool) => tool.name === selected)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="h-7" onClick={loadTools} disabled={loading}>
          {loading ? "listing…" : "list tools"}
        </Button>
        {tools.length ? (
          <span className="font-mono text-[10px] text-faint">{tools.length} tools</span>
        ) : null}
      </div>
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      {tools.length ? (
        <>
          <Field label="tool" htmlFor={`tool-${serverId}`}>
            <Select
              id={`tool-${serverId}`}
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              {tools.map((tool) => (
                <option key={tool.name} value={tool.name}>
                  {tool.name}
                </option>
              ))}
            </Select>
          </Field>
          {activeTool?.description ? (
            <p className="text-[12px] leading-relaxed text-muted">{activeTool.description}</p>
          ) : null}
          <Field label="arguments (JSON object)" htmlFor={`args-${serverId}`}>
            <Textarea
              id={`args-${serverId}`}
              value={args}
              onChange={(event) => setArgs(event.target.value)}
              className="min-h-20 font-mono text-[11px]"
            />
          </Field>
          <Button size="sm" onClick={invoke} disabled={invoking}>
            {invoking ? "invoking…" : "invoke"}
          </Button>
          {result ? (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[10px] text-faint">result</span>
                <CopyButton text={result} />
              </div>
              <pre className="max-h-64 overflow-auto rounded-sm border border-line bg-ink p-2 font-mono text-[11px] leading-relaxed text-muted">
                {result}
              </pre>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
