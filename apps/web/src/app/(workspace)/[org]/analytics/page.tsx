import type { Metadata } from "next"
import Link from "next/link"
import { requireOrgAccess } from "@/lib/auth"
import { listOrgAgents, listRooms } from "@/lib/queries"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/ui/empty"
import { Section } from "@/components/settings/section"
import { AnalyticsCharts, type DailySeriesPoint } from "@/components/analytics/analytics-charts"
import { formatMs, formatNumber, formatUsd, cn } from "@/lib/format"

export const metadata: Metadata = { title: "Analytics" }

interface UsageRow {
  agent_id: string | null
  room_id: string | null
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number | string
  ttft_ms: number | null
  latency_ms: number | null
  created_at: string
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[index] ?? null
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

function dayLabel(key: string): string {
  const date = new Date(`${key}T00:00:00Z`)
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>
  searchParams: Promise<{ days?: string }>
}) {
  const { org: orgSlug } = await params
  const query = await searchParams
  const days = query.days === "7" || query.days === "90" ? Number(query.days) : 30
  const access = await requireOrgAccess(orgSlug)
  const supabase = await createSupabaseServerClient()
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const [eventsResult, agents, rooms] = await Promise.all([
    supabase
      .from("usage_events")
      .select(
        "agent_id, room_id, provider, model, input_tokens, output_tokens, cost_usd, ttft_ms, latency_ms, created_at",
      )
      .eq("org_id", access.org.id)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(10_000),
    listOrgAgents(access.org.id),
    listRooms(access.org.id),
  ])
  const events = (eventsResult.data ?? []) as UsageRow[]
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]))
  const roomsById = new Map(rooms.map((room) => [room.id, room.name]))

  const totals = {
    input: 0,
    output: 0,
    cost: 0,
    runs: events.length,
    ttfts: [] as number[],
    latencies: [] as number[],
  }
  const byAgent = new Map<
    string,
    { input: number; output: number; cost: number; runs: number; ttfts: number[]; latencies: number[] }
  >()
  const byRoom = new Map<string, { tokens: number; cost: number; runs: number }>()
  const byDay = new Map<string, Map<string, number>>()
  const costByDay = new Map<string, number>()

  for (const event of events) {
    const input = event.input_tokens ?? 0
    const output = event.output_tokens ?? 0
    const cost = Number(event.cost_usd) || 0
    totals.input += input
    totals.output += output
    totals.cost += cost
    if (event.ttft_ms !== null) totals.ttfts.push(event.ttft_ms)
    if (event.latency_ms !== null) totals.latencies.push(event.latency_ms)

    const agentKey = event.agent_id ?? "deleted"
    const agent = byAgent.get(agentKey) ?? {
      input: 0,
      output: 0,
      cost: 0,
      runs: 0,
      ttfts: [],
      latencies: [],
    }
    agent.input += input
    agent.output += output
    agent.cost += cost
    agent.runs += 1
    if (event.ttft_ms !== null) agent.ttfts.push(event.ttft_ms)
    if (event.latency_ms !== null) agent.latencies.push(event.latency_ms)
    byAgent.set(agentKey, agent)

    const roomKey = event.room_id ?? "deleted"
    const room = byRoom.get(roomKey) ?? { tokens: 0, cost: 0, runs: 0 }
    room.tokens += input + output
    room.cost += cost
    room.runs += 1
    byRoom.set(roomKey, room)

    const day = dayKey(event.created_at)
    const dayAgents = byDay.get(day) ?? new Map<string, number>()
    const label = event.agent_id
      ? `@${agentsById.get(event.agent_id)?.handle ?? "deleted"}`
      : "deleted agent"
    dayAgents.set(label, (dayAgents.get(label) ?? 0) + input + output)
    byDay.set(day, dayAgents)
    costByDay.set(day, (costByDay.get(day) ?? 0) + cost)
  }

  const topAgents = [...byAgent.entries()]
    .filter(([id]) => id !== "deleted")
    .sort(
      (a, b) =>
        b[1].input + b[1].output - (a[1].input + a[1].output),
    )
    .slice(0, 4)
    .map(([id]) => `@${agentsById.get(id)?.handle ?? "deleted"}`)
  const series = [
    ...topAgents.map((key) => ({ key, label: key })),
    ...(byAgent.size > topAgents.length ? [{ key: "other", label: "other agents" }] : []),
  ]
  if (series.length === 0) series.push({ key: "none", label: "no agents" })

  const daily: DailySeriesPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000)
    const key = date.toISOString().slice(0, 10)
    const point: DailySeriesPoint = { day: dayLabel(key), cost: cartesianCost(costByDay.get(key) ?? 0) }
    for (const item of series) point[item.key] = 0
    const dayAgents = byDay.get(key)
    if (dayAgents) {
      let other = 0
      for (const [label, tokens] of dayAgents) {
        if (topAgents.includes(label)) point[label] = tokens
        else other += tokens
      }
      if (series.some((item) => item.key === "other")) {
        point.other = other
      }
    }
    daily.push(point)
  }

  const agentRows = [...byAgent.entries()]
    .map(([id, value]) => ({
      id,
      handle: id === "deleted" ? "deleted agent" : `@${agentsById.get(id)?.handle ?? "deleted"}`,
      name: id === "deleted" ? "" : agentsById.get(id)?.displayName ?? "",
      ...value,
    }))
    .sort((a, b) => b.input + b.output - (a.input + a.output))

  const roomRows = [...byRoom.entries()]
    .map(([id, value]) => ({
      id,
      name: roomsById.get(id) ?? (id === "deleted" ? "deleted room" : "another room"),
      ...value,
    }))
    .sort((a, b) => b.cost - a.cost)

  const avgTtft = totals.ttfts.length
    ? totals.ttfts.reduce((sum, value) => sum + value, 0) / totals.ttfts.length
    : null
  const p95Latency = percentile(totals.latencies, 95)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <p className="font-mono text-[11px] text-faint">
          <Link href={`/${orgSlug}`} className="hover:text-text">
            workspace
          </Link>{" "}
          / analytics
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-medium tracking-[-0.02em]">Usage</h1>
          <div className="flex items-center gap-1" role="group" aria-label="Range">
            {[7, 30, 90].map((value) => (
              <Link
                key={value}
                href={`/${orgSlug}/analytics?days=${value}`}
                aria-current={days === value ? "page" : undefined}
                className={cn(
                  "rounded-sm border px-2 py-1 font-mono text-[10px]",
                  days === value
                    ? "border-line-strong bg-raised text-text"
                    : "border-line text-muted hover:text-text",
                )}
              >
                {value}d
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
          Model calls recorded by the orchestrator. Cost uses the pricing table. Rows appear after an
          agent answers; moderator decisions also count.
        </p>

        {events.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={`No usage in the last ${days} days`}
              body="Send a message that mentions an agent. If agents fail before their first token, check provider keys and the orchestrator logs."
              action={
                <Link
                  href={`/${orgSlug}/settings/keys`}
                  className="font-mono text-[11px] text-accent underline underline-offset-4"
                >
                  provider keys
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["runs", formatNumber(totals.runs)],
                ["input tokens", formatNumber(totals.input)],
                ["output tokens", formatNumber(totals.output)],
                ["cost", formatUsd(totals.cost)],
                ["avg ttft", formatMs(avgTtft === null ? null : Math.round(avgTtft))],
                ["p95 latency", formatMs(p95Latency)],
              ].map(([label, value]) => (
                <div key={label} className="bg-ink px-3 py-2.5">
                  <dt className="font-mono text-[10px] text-faint">{label}</dt>
                  <dd className="mt-0.5 font-mono text-[15px] text-text">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8">
              <AnalyticsCharts daily={daily} series={series} />
            </div>

            <div className="mt-10">
              <Section title="By agent" description="All runs in the selected range, including moderator decisions.">
                <div className="overflow-x-auto border-y border-line">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line font-mono text-[10px] text-faint">
                        <th className="py-2 pr-3 font-normal">agent</th>
                        <th className="py-2 pr-3 font-normal">runs</th>
                        <th className="py-2 pr-3 font-normal">input</th>
                        <th className="py-2 pr-3 font-normal">output</th>
                        <th className="py-2 pr-3 font-normal">cost</th>
                        <th className="py-2 pr-3 font-normal">avg ttft</th>
                        <th className="py-2 font-normal">p95 latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {agentRows.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 pr-3 text-[12px] text-text">
                            {row.handle}{" "}
                            <span className="font-mono text-[10px] text-faint">{row.name}</span>
                          </td>
                          <td className="py-2 pr-3 font-mono text-[11px] text-muted">{row.runs}</td>
                          <td className="py-2 pr-3 font-mono text-[11px] text-muted">
                            {formatNumber(row.input)}
                          </td>
                          <td className="py-2 pr-3 font-mono text-[11px] text-muted">
                            {formatNumber(row.output)}
                          </td>
                          <td className="py-2 pr-3 font-mono text-[11px] text-muted">
                            {formatUsd(row.cost)}
                          </td>
                          <td className="py-2 pr-3 font-mono text-[11px] text-muted">
                            {formatMs(
                              row.ttfts.length
                                ? Math.round(row.ttfts.reduce((s, v) => s + v, 0) / row.ttfts.length)
                                : null,
                            )}
                          </td>
                          <td className="py-2 font-mono text-[11px] text-muted">
                            {formatMs(percentile(row.latencies, 95))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>

            <div className="mt-10">
              <Section title="By room" description="Private rooms you cannot read still appear as 'another room'.">
                <div className="overflow-x-auto border-y border-line">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line font-mono text-[10px] text-faint">
                        <th className="py-2 pr-3 font-normal">room</th>
                        <th className="py-2 pr-3 font-normal">runs</th>
                        <th className="py-2 pr-3 font-normal">tokens</th>
                        <th className="py-2 font-normal">cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {roomRows.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 pr-3 text-[12px] text-text">{row.name}</td>
                          <td className="py-2 pr-3 font-mono text-[11px] text-muted">{row.runs}</td>
                          <td className="py-2 pr-3 font-mono text-[11px] text-muted">
                            {formatNumber(row.tokens)}
                          </td>
                          <td className="py-2 font-mono text-[11px] text-muted">
                            {formatUsd(row.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>

            <details className="mt-10">
              <summary className="cursor-pointer font-mono text-[10px] text-faint hover:text-text">
                daily data table
              </summary>
              <div className="mt-2 overflow-x-auto border-y border-line">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line font-mono text-[10px] text-faint">
                      <th className="py-2 pr-3 font-normal">day</th>
                      {series.map((item) => (
                        <th key={item.key} className="py-2 pr-3 font-normal">
                          {item.label}
                        </th>
                      ))}
                      <th className="py-2 font-normal">cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {daily.map((point) => (
                      <tr key={point.day}>
                        <td className="py-1.5 pr-3 font-mono text-[10px] text-faint">{point.day}</td>
                        {series.map((item) => (
                          <td
                            key={item.key}
                            className="py-1.5 pr-3 font-mono text-[10px] text-muted"
                          >
                            {formatNumber(Number(point[item.key] ?? 0))}
                          </td>
                        ))}
                        <td className="py-1.5 font-mono text-[10px] text-muted">
                          {formatUsd(point.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  )
}

function cartesianCost(value: number): number {
  return Math.round(value * 1e6) / 1e6
}
