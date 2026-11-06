"use client"

import { useActionState, useMemo } from "react"
import { saveRoomScheduleAction } from "@/lib/actions/onboarding"
import { Button } from "@/components/ui/button"
import { Field, HelpText, Input, Select } from "@/components/ui/field"
import { InlineAlert } from "@/components/ui/empty"
import type { ActionResult, RoomScheduleView } from "@/lib/types"

function timeValue(minutes: number | undefined, fallback: string): string {
  if (minutes === undefined || Number.isNaN(minutes)) return fallback
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

const FALLBACK_ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
]

export function RoomScheduleForm({
  orgSlug,
  roomId,
  timezone,
  schedule,
}: {
  orgSlug: string
  roomId: string
  timezone: string
  schedule: RoomScheduleView | null
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveRoomScheduleAction,
    null,
  )
  const zones = useMemo(() => {
    try {
      const supported = Intl.supportedValuesOf("timeZone")
      const list = supported.includes("UTC") ? supported : ["UTC", ...supported]
      return list.includes(timezone) ? list : [timezone, ...list]
    } catch {
      return FALLBACK_ZONES.includes(timezone) ? FALLBACK_ZONES : [timezone, ...FALLBACK_ZONES]
    }
  }, [timezone])

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="roomId" value={roomId} />
      <Field label="time zone" htmlFor="schedule-timezone">
        <Select
          id="schedule-timezone"
          name="timezone"
          defaultValue={schedule?.timezone ?? timezone ?? "UTC"}
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-3 border border-line bg-panel p-3">
          <p className="font-mono text-[11px] text-faint">morning meeting</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="starts" htmlFor="morning-start">
              <Input
                id="morning-start"
                name="morningStart"
                type="time"
                defaultValue={timeValue(schedule?.morningStartMinutes, "09:00")}
              />
            </Field>
            <Field label="ends" htmlFor="morning-end">
              <Input
                id="morning-end"
                name="morningEnd"
                type="time"
                defaultValue={timeValue(schedule?.morningEndMinutes, "09:30")}
              />
            </Field>
          </div>
        </div>
        <div className="space-y-3 border border-line bg-panel p-3">
          <p className="font-mono text-[11px] text-faint">evening meeting</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="starts" htmlFor="evening-start">
              <Input
                id="evening-start"
                name="eveningStart"
                type="time"
                defaultValue={timeValue(schedule?.eveningStartMinutes, "17:00")}
              />
            </Field>
            <Field label="ends" htmlFor="evening-end">
              <Input
                id="evening-end"
                name="eveningEnd"
                type="time"
                defaultValue={timeValue(schedule?.eveningEndMinutes, "17:30")}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="space-y-3 border border-line bg-panel p-3">
        <label className="flex items-start gap-2 text-[12px] leading-relaxed text-muted">
          <input
            type="checkbox"
            name="checkinsEnabled"
            defaultChecked={schedule?.checkinsEnabled ?? false}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--color-accent)]"
          />
          <span>
            Run check-ins on weekdays between the first and last start time. They stop at the last
            start time and never run on weekends.
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="first check-in" htmlFor="checkin-start">
            <Input
              id="checkin-start"
              name="checkinStart"
              type="time"
              defaultValue={timeValue(schedule?.checkinStartMinutes, "09:00")}
            />
          </Field>
          <Field label="last check-in" htmlFor="checkin-end">
            <Input
              id="checkin-end"
              name="checkinEnd"
              type="time"
              defaultValue={timeValue(schedule?.checkinEndMinutes, "17:30")}
            />
          </Field>
          <Field label="cadence" htmlFor="checkin-interval">
            <Select
              id="checkin-interval"
              name="checkinInterval"
              defaultValue={String(schedule?.checkinIntervalMinutes ?? 60)}
            >
              {[30, 60, 90, 120, 180].map((minutes) => (
                <option key={minutes} value={minutes}>
                  every {minutes} minutes
                </option>
              ))}
            </Select>
          </Field>
          <Field label="length" htmlFor="checkin-duration">
            <Select
              id="checkin-duration"
              name="checkinDuration"
              defaultValue={String(schedule?.checkinDurationMinutes ?? 10)}
            >
              {[5, 10, 15, 20, 30].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </Select>
          </Field>
          <Field label="check-in mode" htmlFor="checkin-mode">
            <Select
              id="checkin-mode"
              name="checkinMode"
              defaultValue={schedule?.checkinMode ?? "stream"}
            >
              <option value="stream">stream (post messages, quiet collapses)</option>
              <option value="digest">digest (quiet rollups only, no messages)</option>
            </Select>
          </Field>
        </div>
      </div>

      <HelpText>
        Meetings fire in this room&apos;s time zone. A host message mentions every agent and the
        agents reply one at a time as usual.
      </HelpText>
      {state ? (
        <InlineAlert tone={state.ok ? "success" : "danger"}>
          {state.ok ? (state.message ?? "Schedule saved") : state.error}
        </InlineAlert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save schedule"}
      </Button>
    </form>
  )
}
