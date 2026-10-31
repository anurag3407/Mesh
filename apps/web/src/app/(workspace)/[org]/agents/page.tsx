import type { Metadata } from "next"
import Link from "next/link"
import { isOrgAdmin, requireOrgAccess } from "@/lib/auth"
import { listMcpServers, listOrgAgents, listProviderKeys, listRooms } from "@/lib/queries"
import { addAgentToRoom } from "@/lib/actions/rooms"
import { updateAgent } from "@/lib/actions/agents"
import { ActionForm } from "@/components/ui/action-form"
import { Field, HelpText, Input, Select, Textarea } from "@/components/ui/field"
import { EmptyState } from "@/components/ui/empty"
import { Section } from "@/components/settings/section"
import { AgentCreateForm } from "@/components/agents/agent-create-form"
import { AgentTestButton } from "@/components/agents/agent-test-button"

export const maxDuration = 60

export const metadata: Metadata = { title: "Agents" }

export default async function AgentsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  const canEdit = isOrgAdmin(access.role)
  const [agents, keys, mcpServers, rooms] = await Promise.all([
    listOrgAgents(access.org.id),
    listProviderKeys(access.org.id),
    listMcpServers(access.org.id),
    listRooms(access.org.id),
  ])
  const keysById = new Map(keys.map((key) => [key.id, key]))

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <p className="font-mono text-[11px] text-faint">
          <Link href={`/${orgSlug}`} className="hover:text-text">
            workspace
          </Link>{" "}
          / agents
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-medium tracking-[-0.02em]">Agents</h1>
          {canEdit ? (
            <Link
              href={`/${orgSlug}/settings/keys`}
              className="font-mono text-[11px] text-muted underline underline-offset-4 hover:text-text"
            >
              provider keys
            </Link>
          ) : null}
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
          LLM agents use a provider key and model. External agents receive a signed webhook and
          answer through the bot gateway. Handles are how humans and other agents mention them.
        </p>

        {!canEdit ? (
          <p className="mt-4 border-l-2 border-line-strong pl-3 font-mono text-[11px] text-muted">
            read-only: only organization admins can edit agents
          </p>
        ) : null}

        <div className="mt-6 space-y-8">
          <Section
            title="Agent roster"
            description={`${agents.length} ${agents.length === 1 ? "agent" : "agents"} in this workspace.`}
          >
            {agents.length === 0 ? (
              <EmptyState
                title="No agents yet"
                body="Create an LLM agent with a provider key, or register an external bot with a webhook URL. Then add it to a room."
              />
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {agents.map((agent) => {
                  const key = agent.providerKeyId ? keysById.get(agent.providerKeyId) : undefined
                  return (
                    <li key={agent.id} className="py-4">
                      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-baseline gap-2">
                            <span className="text-[14px] text-text">{agent.displayName}</span>
                            <span className="font-mono text-[11px] text-muted">@{agent.handle}</span>
                            <span className="font-mono text-[10px] text-faint">{agent.kind}</span>
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-faint">
                            {agent.kind === "external"
                              ? agent.webhookUrl ?? "no webhook url"
                              : `${key ? `${key.label} · ${key.provider}` : "dev fallback"} · ${
                                  agent.model ?? "default model"
                                }`}
                            {agent.toolIds.length
                              ? ` · ${agent.toolIds.length} MCP servers selected`
                              : " · all MCP servers"}
                          </p>
                          {agent.systemPrompt ? (
                            <p className="mt-1 max-w-2xl truncate text-[12px] text-muted">
                              {agent.systemPrompt}
                            </p>
                          ) : null}
                        </div>
                        {canEdit && agent.kind === "llm" ? (
                          <AgentTestButton orgSlug={orgSlug} agentId={agent.id} />
                        ) : null}
                      </div>

                      {canEdit ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-mono text-[10px] text-muted hover:text-text">
                            edit agent
                          </summary>
                          <div className="mt-3 border-l border-line pl-3">
                            <ActionForm action={updateAgent} submitLabel="Save agent">
                              <input type="hidden" name="orgSlug" value={orgSlug} />
                              <input type="hidden" name="agentId" value={agent.id} />
                              <div className="grid gap-3 sm:grid-cols-[140px_1fr_1fr]">
                                <Field label="handle" htmlFor={`handle-${agent.id}`}>
                                  <Input
                                    id={`handle-${agent.id}`}
                                    name="handle"
                                    defaultValue={agent.handle}
                                    required
                                  />
                                </Field>
                                <Field label="display name" htmlFor={`name-${agent.id}`}>
                                  <Input
                                    id={`name-${agent.id}`}
                                    name="displayName"
                                    defaultValue={agent.displayName}
                                    required
                                  />
                                </Field>
                                <Field label="kind">
                                  <Input value={agent.kind} readOnly className="opacity-70" />
                                </Field>
                              </div>

                              {agent.kind === "llm" ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Field label="provider key" htmlFor={`key-${agent.id}`}>
                                    <Select
                                      id={`key-${agent.id}`}
                                      name="providerKeyId"
                                      defaultValue={agent.providerKeyId ?? ""}
                                    >
                                      <option value="">dev fallback (if configured)</option>
                                      {keys.map((option) => (
                                        <option key={option.id} value={option.id}>
                                          {option.label} · {option.provider} · •••• {option.last4}
                                        </option>
                                      ))}
                                    </Select>
                                  </Field>
                                  <Field label="model id" htmlFor={`model-${agent.id}`}>
                                    <Input
                                      id={`model-${agent.id}`}
                                      name="model"
                                      defaultValue={agent.model ?? ""}
                                    />
                                  </Field>
                                </div>
                              ) : (
                                <Field label="webhook url" htmlFor={`webhook-${agent.id}`}>
                                  <Input
                                    id={`webhook-${agent.id}`}
                                    name="webhookUrl"
                                    defaultValue={agent.webhookUrl ?? ""}
                                  />
                                </Field>
                              )}

                              {agent.kind === "llm" ? (
                                <Field label="system prompt" htmlFor={`prompt-${agent.id}`}>
                                  <Textarea
                                    id={`prompt-${agent.id}`}
                                    name="systemPrompt"
                                    defaultValue={agent.systemPrompt}
                                    className="min-h-24"
                                  />
                                </Field>
                              ) : null}

                              <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="params (JSON)" htmlFor={`params-${agent.id}`}>
                                  <Textarea
                                    id={`params-${agent.id}`}
                                    name="params"
                                    defaultValue={JSON.stringify(agent.params, null, 2)}
                                    className="min-h-20 font-mono text-[11px]"
                                  />
                                </Field>
                                <fieldset>
                                  <legend className="mb-1.5 font-mono text-[11px] text-muted">
                                    MCP servers
                                  </legend>
                                  <div className="space-y-1 border border-line bg-panel p-2">
                                    {mcpServers.length === 0 ? (
                                      <p className="text-[12px] text-faint">None registered.</p>
                                    ) : (
                                      mcpServers.map((server) => (
                                        <label
                                          key={server.id}
                                          className="flex items-center justify-between gap-2 text-[12px] text-muted"
                                        >
                                          <span>{server.name}</span>
                                          <input
                                            type="checkbox"
                                            name="toolIds"
                                            value={server.id}
                                            defaultChecked={agent.toolIds.includes(server.id)}
                                            className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                                          />
                                        </label>
                                      ))
                                    )}
                                  </div>
                                </fieldset>
                              </div>
                            </ActionForm>
                          </div>
                        </details>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>

          {canEdit ? (
            <>
              <Section
                title="Create an agent"
                description="External agents return a webhook secret once, on creation. LLM agents use the provider key and model you choose."
              >
                <AgentCreateForm orgSlug={orgSlug} keys={keys} mcpServers={mcpServers} />
              </Section>

              <Section
                title="Add an agent to a room"
                description="Agents only receive turns in rooms they belong to. Turn order in the room follows the order agents were added."
              >
                {agents.length === 0 || rooms.length === 0 ? (
                  <p className="text-[13px] text-muted">
                    Create an agent and a room first. There is nothing to connect yet.
                  </p>
                ) : (
                  <ActionForm action={addAgentToRoom} submitLabel="Add to room">
                    <input type="hidden" name="orgSlug" value={orgSlug} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="agent" htmlFor="add-agent">
                        <Select id="add-agent" name="agentId" required defaultValue="">
                          <option value="" disabled>
                            Choose an agent
                          </option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              @{agent.handle}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="room" htmlFor="add-room">
                        <Select id="add-room" name="roomId" required defaultValue="">
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
                    </div>
                    <HelpText>
                      If the room uses debate mode, set the speaking order in the room settings.
                    </HelpText>
                  </ActionForm>
                )}
              </Section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
