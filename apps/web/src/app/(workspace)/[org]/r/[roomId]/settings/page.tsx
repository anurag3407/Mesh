import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { requireRoomAccess } from "@/lib/auth"
import { listOrgAgents, listRoomAgents } from "@/lib/queries"
import { loadRoomSchedule } from "@/lib/queries-ia"
import { addAgentToRoom, removeAgentFromRoom, updateRoomSettings } from "@/lib/actions/rooms"
import { ActionForm } from "@/components/ui/action-form"
import { Field, HelpText, Input, Select, Textarea } from "@/components/ui/field"
import { EmptyState } from "@/components/ui/empty"
import { Section } from "@/components/settings/section"
import { AgentOrderEditor } from "@/components/rooms/agent-order-editor"
import { RoomScheduleForm } from "@/components/rooms/room-schedule-form"
import { TURN_MODE_LABELS } from "@/lib/format"

export const metadata: Metadata = { title: "Room settings" }

export default async function RoomSettingsPage({
  params,
}: {
  params: Promise<{ org: string; roomId: string }>
}) {
  const { org: orgSlug, roomId } = await params
  const access = await requireRoomAccess(orgSlug, roomId)
  if (!access.canAdmin) redirect(`/${orgSlug}/r/${roomId}`)

  const [roomAgents, orgAgents, schedule] = await Promise.all([
    listRoomAgents(roomId),
    listOrgAgents(access.org.id),
    loadRoomSchedule(roomId),
  ])
  const roomAgentIds = new Set(roomAgents.map(({ agent }) => agent.id))
  const availableAgents = orgAgents.filter((agent) => !roomAgentIds.has(agent.id))
  const roomAgentOptions = roomAgents.map(({ agent }) => ({
    id: agent.id,
    handle: agent.handle,
    displayName: agent.displayName,
  }))
  const initialOrder = access.room.debateOrder.length
    ? access.room.debateOrder
    : roomAgentOptions.map((agent) => agent.id)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <p className="font-mono text-[11px] text-faint">
          <Link href={`/${orgSlug}/r/${roomId}`} className="hover:text-text">
            #{access.room.name}
          </Link>{" "}
          / settings
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-[-0.02em]">Room settings</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
          Turn mode, limits, the room directive and which agents may be called in. Admins of the
          room or the organization can change these.
        </p>

        <div className="mt-6 space-y-8">
          <Section
            title="Turn behavior"
            description="Mention mode follows @handles. Debate runs producer, critics, summarizer. Moderated lets a moderator model pick who speaks next, or return control to humans."
          >
            <ActionForm action={updateRoomSettings} submitLabel="Save room settings">
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <input type="hidden" name="roomId" value={roomId} />
              <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
                <Field label="name" htmlFor="room-name">
                  <Input id="room-name" name="name" defaultValue={access.room.name} required />
                </Field>
                <Field label="turn mode" htmlFor="turn-mode">
                  <Select id="turn-mode" name="turnMode" defaultValue={access.room.turnMode}>
                    {Object.entries(TURN_MODE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="turn cap" htmlFor="turn-cap" hint="1 to 10">
                  <Input
                    id="turn-cap"
                    name="turnCap"
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={access.room.turnCap}
                    className="font-mono"
                  />
                </Field>
                <Field label="rpm limit" htmlFor="rpm" hint="blank = unlimited">
                  <Input
                    id="rpm"
                    name="rpmLimit"
                    type="number"
                    min={1}
                    defaultValue={access.room.rpmLimit ?? ""}
                    className="font-mono"
                  />
                </Field>
                <Field label="daily budget USD" htmlFor="budget" hint="blank = unlimited">
                  <Input
                    id="budget"
                    name="dailyBudgetUsd"
                    type="number"
                    min={0}
                    step="0.000001"
                    defaultValue={access.room.dailyBudgetUsd ?? ""}
                    className="font-mono"
                  />
                </Field>
              </div>

              <Field label="system directive" htmlFor="directive" hint="applies to every agent">
                <Textarea
                  id="directive"
                  name="systemDirective"
                  defaultValue={access.room.systemDirective ?? ""}
                  className="min-h-24"
                  placeholder="Keep answers short. Prefer concrete file paths and commands."
                />
              </Field>

              <Field
                label="moderator"
                htmlFor="moderator"
                hint="required for moderated mode"
              >
                <Select
                  id="moderator"
                  name="moderatorAgentId"
                  defaultValue={access.room.moderatorAgentId ?? ""}
                >
                  <option value="">none</option>
                  {roomAgentOptions.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      @{agent.handle} · {agent.displayName}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="debate order">
                <AgentOrderEditor agents={roomAgentOptions} initialOrder={initialOrder} />
              </Field>

              <HelpText>
                The hard cap is checked before every agent turn. RPM counts agent runs in the last
                minute. Budget uses the pricing table. A halted turn posts a system message and makes
                no further model call.
              </HelpText>
            </ActionForm>
          </Section>

          <Section
            title="Meetings & check-ins"
            description="Two weekday meetings and optional check-ins run in this room's time zone. A host message mentions every agent; turn order still applies."
          >
            <RoomScheduleForm
              orgSlug={orgSlug}
              roomId={roomId}
              timezone={access.room.timezone}
              schedule={schedule}
            />
          </Section>

          <Section
            title="Agents in this room"
            description="Order here is the default debate order. Removing an agent leaves its past messages intact."
          >
            {roomAgents.length === 0 ? (
              <EmptyState
                title="No agents in the room"
                body="Add one below. Without agents the room is human-only chat; mentions do nothing."
              />
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {roomAgents.map(({ agent, position }) => (
                  <li key={agent.id} className="flex flex-wrap items-center gap-2 py-2.5">
                    <span className="w-5 font-mono text-[10px] text-faint">{position + 1}</span>
                    <span className="font-mono text-[12px] text-text">@{agent.handle}</span>
                    <span className="text-[12px] text-muted">{agent.displayName}</span>
                    <span className="font-mono text-[10px] text-faint">
                      {agent.kind} · {agent.model ?? (agent.kind === "external" ? "webhook" : "dev model")}
                    </span>
                    <div className="ml-auto">
                      <ActionForm action={removeAgentFromRoom} submitLabel="remove" submitVariant="danger">
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input type="hidden" name="roomId" value={roomId} />
                        <input type="hidden" name="agentId" value={agent.id} />
                      </ActionForm>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 border-t border-line pt-5">
              {availableAgents.length === 0 ? (
                <p className="text-[13px] text-muted">
                  Every agent in this workspace is already in the room. Create another from the
                  agents page if you need one.
                </p>
              ) : (
                <ActionForm action={addAgentToRoom} submitLabel="Add agent">
                  <input type="hidden" name="orgSlug" value={orgSlug} />
                  <input type="hidden" name="roomId" value={roomId} />
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Field label="agent" htmlFor="add-agent">
                      <Select id="add-agent" name="agentId" required defaultValue="">
                        <option value="" disabled>
                          Choose an agent
                        </option>
                        {availableAgents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            @{agent.handle} · {agent.displayName}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </ActionForm>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
