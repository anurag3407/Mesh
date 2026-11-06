"use client"

import { useState } from "react"
import { CopyButton } from "@/components/copy-button"
import { cn } from "@/lib/format"

type Client = "claude-code" | "claude" | "chatgpt" | "cursor" | "gemini" | "prompt"

const CLIENTS: { id: Client; label: string }[] = [
  { id: "claude", label: "Claude app" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude-code", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
  { id: "gemini", label: "Gemini CLI" },
  { id: "prompt", label: "Kickoff prompt" },
]

function snippet(client: Client, endpoint: string, token: string, handle: string): { steps: string; code: string } {
  const name = `mesh-${handle}`
  const urlWithKey = `${endpoint}/${token}`
  switch (client) {
    case "claude":
      return {
        steps: "Settings → Connectors → Add custom connector. Paste this URL, leave OAuth empty, then enable the connector in a chat.",
        code: urlWithKey,
      }
    case "chatgpt":
      return {
        steps: "Settings → Apps & Connectors → Advanced → turn on Developer mode → Create. Paste this URL, choose “No authentication”, then add it to a chat.",
        code: urlWithKey,
      }
    case "claude-code":
      return {
        steps: "Run this once in a terminal.",
        code: `claude mcp add --transport http ${name} ${endpoint} --header "Authorization: Bearer ${token}"`,
      }
    case "cursor":
      return {
        steps: "Add this to ~/.cursor/mcp.json (or .cursor/mcp.json in a project).",
        code: JSON.stringify(
          { mcpServers: { [name]: { url: endpoint, headers: { Authorization: `Bearer ${token}` } } } },
          null,
          2,
        ),
      }
    case "gemini":
      return {
        steps: "Add this to ~/.gemini/settings.json.",
        code: JSON.stringify(
          { mcpServers: { [name]: { httpUrl: endpoint, headers: { Authorization: `Bearer ${token}` } } } },
          null,
          2,
        ),
      }
    case "prompt":
      return {
        steps: "Paste this into the chat once the connector is on, so the bot knows how to work in Mesh.",
        code: `You are @${handle}, a teammate in my Mesh workspace (connected as the "${name}" tools).
1. Call get_inbox now and handle everything in it.
2. Before posting in a room, read it with get_room_messages.
3. Claim work with claim_task before starting; report with update_task. If blocked, set status "stuck" and name who can help.
4. Never spend money, delete data or contact anyone outside the team without request_human_decision first.
5. When you finish, call get_inbox again. Repeat until it is empty, then summarise what you did.`,
      }
  }
}

/** Per-client setup for connecting someone's own AI subscription to Mesh over MCP. */
export function McpConnect({
  endpoint,
  token,
  handle,
}: {
  endpoint: string
  token: string | null
  handle: string
}) {
  const [client, setClient] = useState<Client>("claude")
  const shown = token ?? "<your agent API key>"
  const { steps, code } = snippet(client, endpoint, shown, handle)

  return (
    <div className="space-y-2">
      <div role="tablist" aria-label="MCP client" className="flex flex-wrap gap-1">
        {CLIENTS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={client === c.id}
            onClick={() => setClient(c.id)}
            className={cn(
              "h-7 rounded-sm border px-2 font-mono text-[11px]",
              client === c.id
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-muted hover:text-text",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="text-[12px] leading-relaxed text-muted">{steps}</p>
      <div className="relative rounded-sm border border-line bg-panel">
        <div className="absolute right-2 top-2">
          <CopyButton text={code} label="copy" />
        </div>
        <pre className="overflow-x-auto p-3 pr-16 font-mono text-[12px] leading-relaxed text-text">
          <code>{code}</code>
        </pre>
      </div>
      {token ? null : (
        <p className="font-mono text-[11px] text-faint">
          Issue a key below to get this filled in. Keys are shown once.
        </p>
      )}
      {client === "claude" || client === "chatgpt" ? (
        <p className="font-mono text-[11px] text-faint">
          This URL contains the key. Treat it like a password and revoke the key if it leaks.
        </p>
      ) : null}
    </div>
  )
}
