import type { Metadata } from "next"
import Link from "next/link"
import { isOrgAdmin, requireOrgAccess } from "@/lib/auth"
import { devModelConfigured } from "@/lib/env"
import { listMcpServers, listOrgAgents, listProviderKeys, listRooms } from "@/lib/queries"
import { addAgentToRoom } from "@/lib/actions/rooms"
import { updateAgent } from "@/lib/actions/agents"
import { ActionForm } from "@/components/ui/action-form"
import { Field, HelpText, Input, Select, Textarea } from "@/components/ui/field"
import { EmptyState } from "@/components/ui/empty"
import { Section } from "@/components/settings/section"
import { AgentCreateForm } from "@/components/agents/agent-create-form"
import { AgentTestButton } from "@/components/agents/agent-test-button"
import { DeleteAgentButton } from "@/components/agents/delete-agent-button"

export const maxDuration = 60

export const metadata: Metadata = { title: "Agents" }

export default async function AgentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>
  searchParams: Promise<{ room?: string }>
}) {
  const { org: orgSlug } = await params
  const { room: requestedRoom } = await searchParams
  const access = await requireOrgAccess(orgSlug)
  const canEdit = isOrgAdmin(access.role)
  const [agents, keys, mcpServers, rooms] = await Promise.all([
    listOrgAgents(access.org.id),
    listProviderKeys(access.org.id),
    listMcpServers(access.org.id),
    listRooms(access.org.id),
  ])
  const keysById = new Map(keys.map((key) => [key.id, key]))
  const hasServerModel = devModelConfigured()
  const addableRooms = rooms.filter((room) => room.kind !== "dm")

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <p className="font-mono text-[12px] text-faint">
          <Link href={`/${orgSlug}`} className="hover:text-text">
            workspace
          </Link>{" "}
          / agents
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-medium tracking-[-0.02em]">Agents</h1>
          <div className="flex items-center gap-3">
            {canEdit ? (
              <Link
                href={`/${orgSlug}/agents/new`}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                + New Bot
              </Link>
            ) : null}
            {canEdit ? (
              <Link
                href={`/${orgSlug}/settings/keys`}
                className="font-mono text-[12px] text-muted underline underline-offset-4 hover:text-text"
              >
                provider keys
              </Link>
            ) : null}
          </div>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
          An agent is a teammate powered by an AI model, or by your own server. People and other
          agents mention it by its @handle.
        </p>

        {!canEdit ? (
          <p className="mt-4 border-l-2 border-line-strong pl-3 font-mono text-[12px] text-muted">
            only workspace admins can change agents
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
                body={canEdit ? "Create your first agent below, then add it to a room." : "Ask a workspace admin to create one."}
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
                            <span className="font-mono text-[12px] text-muted">@{agent.handle}</span>
                            <span className="font-mono text-[11px] text-faint">{agent.kind === "external" ? "external" : "AI model"}</span>
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-faint">
                            {agent.kind === "external"
                              ? agent.webhookUrl ?? "no webhook url"
                              : `${key ? `${key.label} · ${key.provider}` : "server default"} · ${
                                  agent.model ?? "default model"
                                }`}
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
                          <summary className="cursor-pointer py-2 font-mono text-[12px] text-muted hover:text-text md:py-0">
                            Edit agent
                          </summary>
                          <div className="mt-3 border-l border-line pl-3">
                            <ActionForm action={updateAgent} submitLabel="Save agent">
                              <input type="hidden" name="orgSlug" value={orgSlug} />
                              <input type="hidden" name="agentId" value={agent.id} />
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="@handle" htmlFor={`handle-${agent.id}`}>
                                  <Input
                                    id={`handle-${agent.id}`}
                                    name="handle"
                                    defaultValue={agent.handle}
                                    required
                                  />
                                </Field>
                                <Field label="name" htmlFor={`name-${agent.id}`}>
                                  <Input
                                    id={`name-${agent.id}`}
                                    name="displayName"
                                    defaultValue={agent.displayName}
                                    required
                                  />
                                </Field>
                              </div>

                              {agent.kind === "llm" ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Field label="API key" htmlFor={`key-${agent.id}`}>
                                    <Select
                                      id={`key-${agent.id}`}
                                      name="providerKeyId"
                                      defaultValue={agent.providerKeyId ?? ""}
                                    >
                                      {hasServerModel || !agent.providerKeyId ? (
                                        <option value="">Server default model</option>
                                      ) : null}
                                      {keys.map((option) => (
                                        <option key={option.id} value={option.id}>
                                          {option.label} · {option.provider} · •••• {option.last4}
                                        </option>
                                      ))}
                                    </Select>
                                  </Field>
                                  <Field label="model" htmlFor={`model-${agent.id}`}>
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
                                <Field label="what is this agent for?" htmlFor={`prompt-${agent.id}`}>
                                  <Textarea
                                    id={`prompt-${agent.id}`}
                                    name="systemPrompt"
                                    defaultValue={agent.systemPrompt}
                                    className="min-h-24"
                                  />
                                </Field>
                              ) : null}

                              <details className="rounded-sm border border-line bg-panel/50 px-3 py-2">
                                <summary className="cursor-pointer py-1 font-mono text-[12px] text-muted hover:text-text">
                                  Advanced
                                </summary>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <Field label="model parameters (JSON)" htmlFor={`params-${agent.id}`}>
                                  <Textarea
                                    id={`params-${agent.id}`}
                                    name="params"
                                    defaultValue={JSON.stringify(agent.params, null, 2)}
                                    className="min-h-20 font-mono text-[12px]"
                                  />
                                </Field>
                                <fieldset>
                                  <legend className="mb-1.5 font-mono text-[12px] text-muted">
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
                              </details>
                            </ActionForm>
                            <div className="mt-4 border-t border-line pt-3">
                              <DeleteAgentButton
                                orgSlug={orgSlug}
                                agentId={agent.id}
                                handle={agent.handle}
                              />
                            </div>
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
              <div id="create-agent" className="scroll-mt-6">
                <Section
                  title="Create an agent"
                  description="It gets tested as soon as it is created, so you find out right away if something is wrong."
                >
                  <AgentCreateForm
                    orgSlug={orgSlug}
                    keys={keys}
                    mcpServers={mcpServers}
                    rooms={addableRooms}
                    initialRoomId={requestedRoom ?? ""}
                    hasServerModel={hasServerModel}
                  />
                </Section>
              </div>

              <Section
                title="Add an agent to a room"
                description="Agents can only reply in rooms they belong to. They reply in the order they were added."
              >
                {agents.length === 0 || addableRooms.length === 0 ? (
                  <p className="text-[13px] text-muted">
                    Create an agent and a room first.
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
                          {addableRooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <HelpText>
                      For debate rooms, set the speaking order in room settings.
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
