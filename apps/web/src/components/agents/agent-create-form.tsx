"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createAgent } from "@/lib/actions/agents"
import { Button } from "@/components/ui/button"
import { Field, HelpText, Input, Select, Textarea } from "@/components/ui/field"
import { InlineAlert } from "@/components/ui/empty"
import { CopyButton } from "@/components/copy-button"
import type { ActionResult, McpServerView, ProviderKeyView } from "@/lib/types"

export function AgentCreateForm({
  orgSlug,
  keys,
  mcpServers,
}: {
  orgSlug: string
  keys: ProviderKeyView[]
  mcpServers: McpServerView[]
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createAgent, null)
  const [kind, setKind] = useState("llm")
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
      setKind("llm")
      router.refresh()
    }
  }, [state, router])

  const webhookSecret = state?.ok && typeof state.data?.webhookSecret === "string"
    ? state.data.webhookSecret
    : null

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      {state && !state.ok ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      {state?.ok ? (
        <div className="space-y-2">
          <InlineAlert tone="success">{state.message}</InlineAlert>
          {webhookSecret ? (
            <div className="rounded-sm border border-[color-mix(in_srgb,var(--color-accent)_40%,transparent)] bg-accent-soft p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] text-accent">
                  webhook secret, shown once. Store it with the bot.
                </p>
                <CopyButton text={webhookSecret} label="copy secret" />
              </div>
              <code className="mt-1 block break-all font-mono text-[11px] text-text">
                {webhookSecret}
              </code>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[140px_1fr_1fr]">
        <Field label="kind" htmlFor="agent-kind">
          <Select
            id="agent-kind"
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="llm">llm</option>
            <option value="external">external bot</option>
          </Select>
        </Field>
        <Field label="handle" htmlFor="agent-handle" hint="lowercase">
          <Input id="agent-handle" name="handle" required placeholder="reviewer" />
        </Field>
        <Field label="display name" htmlFor="agent-display">
          <Input id="agent-display" name="displayName" required placeholder="Reviewer" />
        </Field>
      </div>

      {kind === "llm" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="provider key" htmlFor="agent-key">
              <Select id="agent-key" name="providerKeyId" defaultValue="">
                <option value="">dev fallback (if configured)</option>
                {keys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.label} · {key.provider} · •••• {key.last4}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="model id" htmlFor="agent-model" hint={keys.length ? "required with a key" : "optional"}>
              <Input id="agent-model" name="model" placeholder="gpt-4.1-mini" />
            </Field>
          </div>
          <Field label="system prompt" htmlFor="agent-prompt">
            <Textarea
              id="agent-prompt"
              name="systemPrompt"
              className="min-h-28"
              placeholder="You review proposals for missing migrations and rollback steps."
            />
          </Field>
        </>
      ) : (
        <Field label="webhook url" htmlFor="agent-webhook" hint="https only in production">
          <Input id="agent-webhook" name="webhookUrl" placeholder="https://bot.example.com/hooks/mesh" />
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="params (JSON)" htmlFor="agent-params" hint="optional">
          <Textarea
            id="agent-params"
            name="params"
            className="min-h-20 font-mono text-[11px]"
            defaultValue="{}"
          />
        </Field>
        <fieldset>
          <legend className="mb-1.5 font-mono text-[11px] text-muted">
            MCP servers available to this agent
          </legend>
          {mcpServers.length === 0 ? (
            <p className="text-[12px] text-faint">No MCP servers registered yet.</p>
          ) : (
            <div className="space-y-1 border border-line bg-panel p-2">
              {mcpServers.map((server) => (
                <label
                  key={server.id}
                  className="flex items-center justify-between gap-2 text-[12px] text-muted"
                >
                  <span>
                    {server.name}
                    {server.enabled ? "" : " (disabled)"}
                  </span>
                  <input
                    type="checkbox"
                    name="toolIds"
                    value={server.id}
                    className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                  />
                </label>
              ))}
            </div>
          )}
          <HelpText>Leave all unchecked to mount every enabled server.</HelpText>
        </fieldset>
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "creating…" : "create agent"}
      </Button>
    </form>
  )
}
