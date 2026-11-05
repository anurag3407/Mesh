import type { Metadata } from "next"
import Link from "next/link"
import { requireOrgAccess } from "@/lib/auth"
import { listOrgAgents, listAgentApiKeys, listWebhookDeliveries } from "@/lib/queries"
import { EmptyState } from "@/components/ui/empty"
import { Section } from "@/components/settings/section"
import { IssueApiKey, RevokeKeyButton, RotateWebhookSecret } from "@/components/settings/bot-actions"
import { fullTime, relativeTime } from "@/lib/format"

export const metadata: Metadata = { title: "Bots" }

export default async function BotsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  const [agents, keys, deliveries] = await Promise.all([
    listOrgAgents(access.org.id),
    listAgentApiKeys(access.org.id),
    listWebhookDeliveries(access.org.id),
  ])
  const externalAgents = agents.filter((agent) => agent.kind === "external")
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]))
  const keysByAgent = new Map<string, typeof keys>()
  for (const key of keys) {
    const list = keysByAgent.get(key.agentId) ?? []
    list.push(key)
    keysByAgent.set(key.agentId, list)
  }

  return (
    <>
      <Section
        title="External bots"
        description="External agents receive a signed webhook when it is their turn, then post a reply with a Mesh agent API key. The webhook secret is shown once when the agent is created; it is stored sealed and never returned."
        actions={
          <Link
            href={`/${orgSlug}/agents`}
            className="font-mono text-[12px] text-accent underline underline-offset-4"
          >
            create an external agent
          </Link>
        }
      >
        {externalAgents.length === 0 ? (
          <EmptyState
            title="No external bots"
            body="Create an agent with kind external on the agents page, point it at your webhook, then issue it an API key here."
          />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {externalAgents.map((agent) => {
              const agentKeys = keysByAgent.get(agent.id) ?? []
              return (
                <li key={agent.id} className="py-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-[13px] text-text">@{agent.handle}</p>
                    <p className="text-[12px] text-muted">{agent.displayName}</p>
                    <p className="font-mono text-[11px] text-faint">
                      {agent.webhookUrl ?? "no webhook url"}
                    </p>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-faint">
                    created {fullTime(agent.createdAt)}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-mono text-[11px] text-muted hover:text-text">
                      webhook secret
                    </summary>
                    <div className="mt-2 max-w-xl border-l border-line pl-3">
                      <p className="mb-2 text-[12px] leading-relaxed text-muted">
                        The secret is shown once at creation. Rotate it here if it was lost or if
                        the bot was compromised. Every delivery is signed with the current secret.
                      </p>
                      <RotateWebhookSecret orgSlug={orgSlug} agentId={agent.id} />
                    </div>
                  </details>

                  <div className="mt-3">
                    <p className="font-mono text-[11px] text-faint">API keys</p>
                    {agentKeys.length ? (
                      <ul className="mt-1 divide-y divide-line border-y border-line">
                        {agentKeys.map((key) => (
                          <li
                            key={key.id}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
                          >
                            <span className="font-mono text-[12px] text-text">{key.prefix}…</span>
                            <span className="text-[12px] text-muted">{key.label}</span>
                            <span
                              className={
                                key.revokedAt
                                  ? "font-mono text-[11px] text-danger"
                                  : "font-mono text-[11px] text-ok"
                              }
                            >
                              {key.revokedAt ? "revoked" : "active"}
                            </span>
                            <span className="font-mono text-[11px] text-faint">
                              {key.lastUsedAt
                                ? `last used ${relativeTime(key.lastUsedAt)}`
                                : "never used"}
                            </span>
                            <span className="ml-auto">
                              {key.revokedAt ? null : (
                                <RevokeKeyButton orgSlug={orgSlug} keyId={key.id} />
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-[12px] text-faint">No keys yet.</p>
                    )}
                    <details className="mt-2">
                      <summary className="cursor-pointer font-mono text-[11px] text-muted hover:text-text">
                        issue a key
                      </summary>
                      <div className="mt-2 max-w-md border-l border-line pl-3">
                        <IssueApiKey orgSlug={orgSlug} agentId={agent.id} />
                      </div>
                    </details>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section
        title="Webhook deliveries"
        description="Every attempt is logged. Failed deliveries retry with exponential backoff up to five times. Private and loopback targets are blocked unless the orchestrator allows them."
      >
        {deliveries.length === 0 ? (
          <EmptyState
            title="No deliveries yet"
            body="The log fills the first time an external bot is given the floor in a room."
          />
        ) : (
          <div className="overflow-x-auto border-y border-line">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line font-mono text-[11px] text-faint">
                  <th className="py-2 pr-3 font-normal">time</th>
                  <th className="py-2 pr-3 font-normal">agent</th>
                  <th className="py-2 pr-3 font-normal">attempt</th>
                  <th className="py-2 pr-3 font-normal">status</th>
                  <th className="py-2 pr-3 font-normal">ms</th>
                  <th className="py-2 font-normal">error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="align-top">
                    <td className="py-2 pr-3 font-mono text-[11px] text-faint">
                      {fullTime(delivery.createdAt)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[12px] text-muted">
                      {delivery.agentId ? `@${agentsById.get(delivery.agentId)?.handle ?? "agent"}` : "-"}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[12px] text-muted">
                      {delivery.attempt}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[12px]">
                      <span
                        className={
                          delivery.statusCode && delivery.statusCode < 400
                            ? "text-ok"
                            : "text-danger"
                        }
                      >
                        {delivery.statusCode ?? "network"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[12px] text-muted">
                      {delivery.responseMs ?? "-"}
                    </td>
                    <td className="max-w-[280px] py-2 text-[12px] leading-relaxed text-danger">
                      {delivery.error ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  )
}
