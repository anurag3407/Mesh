"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  finishOnboardingAction,
  saveNotificationsAction,
  saveOnboardingPhotoAction,
  saveRoomScheduleAction,
  saveRoomInstructionsAction,
  setupWorkspaceAction,
} from "@/lib/actions/onboarding"
import { Button } from "@/components/ui/button"
import { Field, HelpText, Input, Select, Textarea } from "@/components/ui/field"
import { InlineAlert } from "@/components/ui/empty"
import { cn } from "@/lib/format"
import { readAvatarFile } from "@/lib/image-avatar"
import type { ActionResult } from "@/lib/types"

const STEP_TITLES = [
  "Name your room",
  "Add a photo",
  "Notifications",
  "Daily meetings",
  "Check-ins",
  "Room instructions",
  "Ready",
] as const

const NOTIFICATION_OPTIONS = [
  {
    value: "all",
    label: "Everything",
    detail: "Every new message, including agent replies.",
  },
  {
    value: "mentions",
    label: "Only what needs me",
    detail: "Messages that mention you. Requests still wait in the Inbox.",
  },
  { value: "off", label: "Nothing", detail: "Keep the inbox quiet. You can still browse." },
] as const

type NotificationMode = (typeof NOTIFICATION_OPTIONS)[number]["value"]

const INTERVALS = [
  { value: "30", label: "every 30 minutes" },
  { value: "60", label: "every hour" },
  { value: "90", label: "every 90 minutes" },
  { value: "120", label: "every 2 hours" },
  { value: "180", label: "every 3 hours" },
]

const DURATIONS = [
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "20", label: "20 minutes" },
  { value: "30", label: "30 minutes" },
]

function summarizeTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number)
  if (hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value
  }
  const suffix = hours >= 12 ? "pm" : "am"
  const display = hours % 12 === 0 ? 12 : hours % 12
  return `${display}:${String(minutes).padStart(2, "0")}${suffix}`
}

function StepRail({
  step,
  completed,
}: {
  step: number
  completed: boolean
}) {
  return (
    <ol className="space-y-px">
      {STEP_TITLES.map((title, index) => {
        const state = index < step ? "done" : index === step ? "current" : "upcoming"
        return (
          <li
            key={title}
            aria-current={index === step ? "step" : undefined}
            className={cn(
              "flex items-center gap-3 border-l-2 py-2 pl-3 font-mono text-[11px] transition-colors",
              state === "current"
                ? "border-accent text-text"
                : state === "done"
                  ? "border-line-strong text-muted"
                  : "border-line text-faint",
            )}
          >
            <span
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]",
                state === "current"
                  ? "border-accent text-accent"
                  : state === "done"
                    ? "border-line-strong text-muted"
                    : "border-line text-faint",
              )}
            >
              {state === "done" ? "✓" : index + 1}
            </span>
            <span className="truncate">{title}</span>
          </li>
        )
      })}
      {completed ? (
        <li className="border-l-2 border-accent py-2 pl-3 font-mono text-[11px] text-accent">
          <span className="flex items-center gap-3">
            <span className="grid h-5 w-5 place-items-center rounded-full border border-accent text-[10px]">
              ✓
            </span>
            Room ready
          </span>
        </li>
      ) : null}
    </ol>
  )
}

export function OnboardingWizard({
  userName,
  defaultTimeZone,
  timeZones,
}: {
  userName: string
  defaultTimeZone: string
  timeZones: string[]
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [workspace, setWorkspace] = useState<{ slug: string; roomId: string } | null>(null)
  const [roomName, setRoomName] = useState("")
  const [timezone, setTimezone] = useState(defaultTimeZone)
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoTouched, setPhotoTouched] = useState(false)
  const [notificationMode, setNotificationMode] = useState<NotificationMode>("all")
  const [sound, setSound] = useState(true)
  const [morningStart, setMorningStart] = useState("09:00")
  const [morningEnd, setMorningEnd] = useState("09:30")
  const [eveningStart, setEveningStart] = useState("17:00")
  const [eveningEnd, setEveningEnd] = useState("17:30")
  const [checkinsEnabled, setCheckinsEnabled] = useState(false)
  const [checkinStart, setCheckinStart] = useState("09:00")
  const [checkinEnd, setCheckinEnd] = useState("17:30")
  const [checkinInterval, setCheckinInterval] = useState("60")
  const [checkinDuration, setCheckinDuration] = useState("10")
  const [instructions, setInstructions] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileInput = useRef<HTMLInputElement>(null)
  const timezoneTouched = useRef(false)

  useEffect(() => {
    if (timezoneTouched.current) return
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (local && timeZones.includes(local)) setTimezone(local)
    // Only auto-detect on the first paint; later choices win.
  }, [timeZones])

  const showError = (result: ActionResult) => {
    if (!result.ok) {
      setError(result.error ?? "Something went wrong")
      return false
    }
    setError(null)
    return true
  }

  function next() {
    setError(null)
    startTransition(async () => {
      if (step === 0) {
        if (!workspace) {
          const form = new FormData()
          form.set("roomName", roomName)
          form.set("timezone", timezone)
          const result = await setupWorkspaceAction(null, form)
          if (!showError(result)) return
          const slug = typeof result.data?.orgSlug === "string" ? result.data.orgSlug : ""
          const roomId = typeof result.data?.roomId === "string" ? result.data.roomId : ""
          if (!slug || !roomId) {
            setError("The workspace was created but could not be opened. Reload to continue.")
            return
          }
          setWorkspace({ slug, roomId })
        }
        setStep(1)
        return
      }
      if (!workspace) {
        setError("Start again from the first step")
        setStep(0)
        return
      }
      if (step === 1) {
        if (photo || photoTouched) {
          const form = new FormData()
          form.set("photo", photo ?? "")
          const result = await saveOnboardingPhotoAction(null, form)
          if (!showError(result)) return
        }
        setStep(2)
        return
      }
      if (step === 2) {
        const form = new FormData()
        form.set("mode", notificationMode)
        form.set("sound", sound ? "on" : "off")
        const result = await saveNotificationsAction(null, form)
        if (!showError(result)) return
        setStep(3)
        return
      }
      if (step === 3 || step === 4) {
        if (morningEnd <= morningStart || eveningEnd <= eveningStart) {
          setError("Each meeting has to end after it starts")
          return
        }
        if (checkinsEnabled && checkinEnd <= checkinStart) {
          setError("Check-ins have to end after they start")
          return
        }
        const form = new FormData()
        form.set("orgSlug", workspace.slug)
        form.set("roomId", workspace.roomId)
        form.set("timezone", timezone)
        form.set("morningStart", morningStart)
        form.set("morningEnd", morningEnd)
        form.set("eveningStart", eveningStart)
        form.set("eveningEnd", eveningEnd)
        form.set("checkinStart", checkinStart)
        form.set("checkinEnd", checkinEnd)
        form.set("checkinInterval", checkinInterval)
        form.set("checkinDuration", checkinDuration)
        if (checkinsEnabled) form.set("checkinsEnabled", "on")
        const result = await saveRoomScheduleAction(null, form)
        if (!showError(result)) return
        setStep(step === 3 ? 4 : 5)
        return
      }
      if (step === 5) {
        if (instructions.length > 4_000) {
          setError("Keep room instructions under 4,000 characters")
          return
        }
        const form = new FormData()
        form.set("orgSlug", workspace.slug)
        form.set("roomId", workspace.roomId)
        form.set("instructions", instructions)
        const result = await saveRoomInstructionsAction(null, form)
        if (!showError(result)) return
        setStep(6)
        return
      }
      if (step === 6) {
        const result = await finishOnboardingAction(workspace.slug, workspace.roomId)
        if (!showError(result)) return
        setCompleted(true)
        const path = typeof result.data?.path === "string" ? result.data.path : `/${workspace.slug}`
        router.push(path)
        router.refresh()
      }
    })
  }

  function back() {
    if (step === 0 || pending) return
    setError(null)
    setStep(step - 1)
  }

  async function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setError(null)
      const result = await readAvatarFile(file)
      setPhoto(result)
      setPhotoTouched(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : "That image could not be read")
    }
  }

  const steps = [
    <StepName
      key="name"
      roomName={roomName}
      onRoomName={setRoomName}
      timezone={timezone}
      onTimezone={(value) => {
        timezoneTouched.current = true
        setTimezone(value)
      }}
      timeZones={timeZones}
      workspace={workspace}
    />,
    <StepPhoto
      key="photo"
      photo={photo}
      onPick={() => fileInput.current?.click()}
      onRemove={() => {
        setPhoto(null)
        setPhotoTouched(true)
        if (fileInput.current) fileInput.current.value = ""
      }}
    />,
    <StepNotifications
      key="notifications"
      mode={notificationMode}
      onMode={setNotificationMode}
      sound={sound}
      onSound={setSound}
    />,
    <StepMeetings
      key="meetings"
      morningStart={morningStart}
      morningEnd={morningEnd}
      eveningStart={eveningStart}
      eveningEnd={eveningEnd}
      onMorningStart={setMorningStart}
      onMorningEnd={setMorningEnd}
      onEveningStart={setEveningStart}
      onEveningEnd={setEveningEnd}
      timezone={timezone}
    />,
    <StepCheckins
      key="checkins"
      enabled={checkinsEnabled}
      onEnabled={setCheckinsEnabled}
      start={checkinStart}
      end={checkinEnd}
      interval={checkinInterval}
      duration={checkinDuration}
      onStart={setCheckinStart}
      onEnd={setCheckinEnd}
      onInterval={setCheckinInterval}
      onDuration={setCheckinDuration}
    />,
    <StepInstructions
      key="instructions"
      value={instructions}
      onChange={setInstructions}
      roomName={roomName}
    />,
    <StepReady
      key="ready"
      userName={userName}
      roomName={roomName}
      timezone={timezone}
      notificationMode={notificationMode}
      morning={`${summarizeTime(morningStart)} to ${summarizeTime(morningEnd)}`}
      evening={`${summarizeTime(eveningStart)} to ${summarizeTime(eveningEnd)}`}
      checkins={checkinsEnabled}
      instructions={instructions}
    />,
  ]

  return (
    <div className="grid min-h-dvh lg:grid-cols-[19rem_1fr]">
      <aside className="flex flex-col border-b border-line px-6 py-7 lg:border-b-0 lg:border-r lg:px-8 lg:py-10">
        <div className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 place-items-center bg-accent font-mono text-[13px] font-medium text-void">
            m
          </span>
          <span className="font-mono text-sm text-text">mesh</span>
        </div>
        <div className="mt-10">
          <p className="font-mono text-[10px] text-faint">setup · {Math.min(step + 1, 7)} of 7</p>
          <h2 className="mt-2 text-[17px] font-medium tracking-[-0.01em]">Set up your room</h2>
          <p className="mt-2 max-w-[30ch] text-[12px] leading-relaxed text-muted">
            A room is where you, your team and your agents work in one thread.
          </p>
        </div>
        <div className="mt-8">
          <StepRail step={step} completed={completed} />
        </div>
        <p className="mt-auto hidden pt-10 font-mono text-[10px] leading-relaxed text-faint lg:block">
          Everything here can be changed later in room settings.
        </p>
      </aside>

      <main className="flex flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className="mx-auto w-full max-w-xl">
          <p className="font-mono text-[10px] text-faint">step {Math.min(step + 1, 7)}</p>
          <h1 className="mt-2 text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
            {STEP_TITLES[step]}
          </h1>
          <div className="mt-7">{steps[step]}</div>
          {error ? (
            <div className="mt-5">
              <InlineAlert tone="danger">{error}</InlineAlert>
            </div>
          ) : null}
        </div>

        <div className="mx-auto mt-auto w-full max-w-xl pt-10">
          <div className="flex items-center gap-3 border-t border-line pt-5">
            <Button
              variant="ghost"
              size="md"
              onClick={back}
              disabled={step === 0 || pending}
              className={cn(step === 0 && "invisible")}
            >
              Back
            </Button>
            <span className="ml-auto" />
            <Button variant="primary" size="lg" onClick={next} disabled={pending}>
              {pending
                ? "Saving…"
                : step === 0
                  ? workspace
                    ? "Continue"
                    : "Create room"
                  : step === 6
                    ? "Open room"
                    : "Continue"}
            </Button>
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={onPhotoChange}
          tabIndex={-1}
        />
      </main>
    </div>
  )
}

function StepName({
  roomName,
  onRoomName,
  timezone,
  onTimezone,
  timeZones,
  workspace,
}: {
  roomName: string
  onRoomName: (value: string) => void
  timezone: string
  onTimezone: (value: string) => void
  timeZones: string[]
  workspace: { slug: string; roomId: string } | null
}) {
  return (
    <div className="space-y-5">
      <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
        This creates a workspace for you and a first room inside it. Team members and agents can be
        added afterwards.
      </p>
      <Field label="room name" htmlFor="room-name" hint="1–60 characters">
        <Input
          id="room-name"
          value={roomName}
          onChange={(event) => onRoomName(event.target.value)}
          maxLength={60}
          placeholder="Design partners"
          disabled={Boolean(workspace)}
          autoFocus
        />
      </Field>
      <Field label="time zone" htmlFor="room-timezone" hint="used for meetings">
        <Select
          id="room-timezone"
          value={timezone}
          onChange={(event) => onTimezone(event.target.value)}
          disabled={Boolean(workspace)}
        >
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
          {timeZones.includes(timezone) ? null : <option value={timezone}>{timezone}</option>}
        </Select>
        <HelpText>
          Daily meetings and check-ins fire in this zone, even when nobody has the app open.
        </HelpText>
      </Field>
      {workspace ? (
        <InlineAlert tone="success">
          Workspace created at /{workspace.slug}. Keep going to make the room yours.
        </InlineAlert>
      ) : null}
    </div>
  )
}

function StepPhoto({
  photo,
  onPick,
  onRemove,
}: {
  photo: string | null
  onPick: () => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-6">
      <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
        This is your profile photo, not the room&apos;s. It appears on messages you send and in the
        workspace footer. Optional.
      </p>
      <div className="flex items-center gap-5">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-panel">
          {photo ? (
            <img src={photo} alt="Room photo preview" className="h-full w-full object-cover" />
          ) : (
            <span className="font-mono text-[11px] text-faint">no photo</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onPick}>
              {photo ? "Replace photo" : "Choose photo"}
            </Button>
            {photo ? (
              <Button variant="quiet" size="sm" onClick={onRemove}>
                Remove
              </Button>
            ) : null}
          </div>
          <p className="font-mono text-[10px] text-faint">PNG, JPEG or WebP · under 200 KB</p>
        </div>
      </div>
      <div className="rounded-sm border border-line bg-panel p-4">
        <p className="text-[12px] leading-relaxed text-muted">
          Prefer keeping your own face out of it? A small illustration or a color tile works just as
          well. You can also skip this and change it later from your profile.
        </p>
      </div>
    </div>
  )
}

function StepNotifications({
  mode,
  onMode,
  sound,
  onSound,
}: {
  mode: NotificationMode
  onMode: (mode: NotificationMode) => void
  sound: boolean
  onSound: (value: boolean) => void
}) {
  return (
    <div className="space-y-6">
      <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
        Decide what should pull your attention. Anything you mute still lands in the Inbox.
      </p>
      <div className="divide-y divide-line border border-line">
        {NOTIFICATION_OPTIONS.map((option) => {
          const active = mode === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onMode(option.value)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                active ? "bg-raised" : "bg-panel hover:bg-raised/60",
              )}
              aria-pressed={active}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                  active ? "border-accent" : "border-line-strong",
                )}
              >
                {active ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
              </span>
              <span>
                <span className="block text-[13px] text-text">{option.label}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">
                  {option.detail}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-muted">
        <input
          type="checkbox"
          checked={sound}
          onChange={(event) => onSound(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--color-accent)]"
        />
        <span>Play a soft sound for new messages while the tab is open. Browser settings win.</span>
      </label>
    </div>
  )
}

function TimeRange({
  idPrefix,
  label,
  start,
  end,
  onStart,
  onEnd,
}: {
  idPrefix: string
  label: string
  start: string
  end: string
  onStart: (value: string) => void
  onEnd: (value: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
      <Field label={`${label} starts`} htmlFor={`${idPrefix}-start`}>
        <Input
          id={`${idPrefix}-start`}
          type="time"
          value={start}
          onChange={(event) => onStart(event.target.value)}
        />
      </Field>
      <span className="hidden pb-2.5 font-mono text-[10px] text-faint sm:block">to</span>
      <Field label={`${label} ends`} htmlFor={`${idPrefix}-end`}>
        <Input
          id={`${idPrefix}-end`}
          type="time"
          value={end}
          onChange={(event) => onEnd(event.target.value)}
        />
      </Field>
    </div>
  )
}

function StepMeetings({
  morningStart,
  morningEnd,
  eveningStart,
  eveningEnd,
  onMorningStart,
  onMorningEnd,
  onEveningStart,
  onEveningEnd,
  timezone,
}: {
  morningStart: string
  morningEnd: string
  eveningStart: string
  eveningEnd: string
  onMorningStart: (value: string) => void
  onMorningEnd: (value: string) => void
  onEveningStart: (value: string) => void
  onEveningEnd: (value: string) => void
  timezone: string
}) {
  return (
    <div className="space-y-6">
      <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
        Two short stand-ups run each weekday. Agents get a turn to speak, so everyone starts and
        ends the day with the same picture. Times are in {timezone.replaceAll("_", " ")}.
      </p>
      <div className="space-y-5 border border-line bg-panel p-4">
        <TimeRange
          idPrefix="morning"
          label="Morning meeting"
          start={morningStart}
          end={morningEnd}
          onStart={onMorningStart}
          onEnd={onMorningEnd}
        />
        <div className="rounded-sm bg-raised px-3 py-2">
          <p className="text-[12px] leading-relaxed text-muted">
            A host message pings every agent in the room. Bots answer in turn order, not all at once.
          </p>
        </div>
      </div>
      <div className="space-y-5 border border-line bg-panel p-4">
        <TimeRange
          idPrefix="evening"
          label="Evening meeting"
          start={eveningStart}
          end={eveningEnd}
          onStart={onEveningStart}
          onEnd={onEveningEnd}
        />
        <div className="rounded-sm bg-raised px-3 py-2">
          <p className="text-[12px] leading-relaxed text-muted">
            Use the evening round for handoff: what shipped, what is blocked, what happens tomorrow.
          </p>
        </div>
      </div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  detail,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  detail: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex w-full items-center gap-4 border border-line bg-panel px-4 py-3.5 text-left transition-colors hover:bg-raised/60"
    >
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked ? "border-accent bg-accent" : "border-line-strong bg-raised",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all",
            checked ? "left-[18px] bg-void" : "left-0.5 bg-muted",
          )}
        />
      </span>
      <span>
        <span className="block text-[13px] text-text">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{detail}</span>
      </span>
    </button>
  )
}

function StepCheckins({
  enabled,
  onEnabled,
  start,
  end,
  interval,
  duration,
  onStart,
  onEnd,
  onInterval,
  onDuration,
}: {
  enabled: boolean
  onEnabled: (value: boolean) => void
  start: string
  end: string
  interval: string
  duration: string
  onStart: (value: string) => void
  onEnd: (value: string) => void
  onInterval: (value: string) => void
  onDuration: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
        Check-ins are short agent-led rounds between meetings. Turn them off if two stand-ups a day
        is enough.
      </p>
      <Toggle
        checked={enabled}
        onChange={onEnabled}
        label="Run check-ins on weekdays"
        detail="A host asks for a quick status round on a fixed cadence."
      />
      <div className={cn("space-y-5 transition-opacity", enabled ? "opacity-100" : "opacity-45")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="first check-in" htmlFor="checkin-start">
            <Input
              id="checkin-start"
              type="time"
              value={start}
              onChange={(event) => onStart(event.target.value)}
              disabled={!enabled}
            />
          </Field>
          <Field label="last check-in" htmlFor="checkin-end">
            <Input
              id="checkin-end"
              type="time"
              value={end}
              onChange={(event) => onEnd(event.target.value)}
              disabled={!enabled}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="cadence" htmlFor="checkin-interval">
            <Select
              id="checkin-interval"
              value={interval}
              onChange={(event) => onInterval(event.target.value)}
              disabled={!enabled}
            >
              {INTERVALS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="each one runs for" htmlFor="checkin-duration">
            <Select
              id="checkin-duration"
              value={duration}
              onChange={(event) => onDuration(event.target.value)}
              disabled={!enabled}
            >
              {DURATIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <HelpText>
          Check-ins stop at the last start time. Nothing runs on weekends, and an ended meeting
          never reopens.
        </HelpText>
      </div>
    </div>
  )
}

function StepInstructions({
  value,
  onChange,
  roomName,
}: {
  value: string
  onChange: (value: string) => void
  roomName: string
}) {
  return (
    <div className="space-y-5">
      <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
        Standing instructions for every agent in {roomName || "this room"}. Write it like a brief to
        a new teammate, not a prompt.
      </p>
      <Field
        label="room instructions"
        htmlFor="instructions"
        hint={`${value.length}/4,000`}
      >
        <Textarea
          id="instructions"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={4_000}
          rows={7}
          placeholder={"Example: We ship on Thursdays. Keep replies under 120 words. Cite the file or thread you are working from. Ask before changing shared canvases."}
        />
      </Field>
      <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
        {[
          ["tone", "Say how direct replies should be."],
          ["boundaries", "Name files or systems agents must not touch."],
          ["rituals", "Describe how stand-ups and check-ins should report."],
          ["handoff", "Say what a good end-of-day note contains."],
        ].map(([term, detail]) => (
          <div key={term} className="bg-panel p-3">
            <p className="font-mono text-[10px] text-faint">{term}</p>
            <p className="mt-1 text-[12px] leading-snug text-muted">{detail}</p>
          </div>
        ))}
      </div>
      <HelpText>Optional. You can edit this any time in room settings.</HelpText>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-wide text-faint">{label}</dt>
      <dd className="max-w-[60%] text-right text-[12px] leading-relaxed text-muted">{value}</dd>
    </div>
  )
}

function StepReady({
  userName,
  roomName,
  timezone,
  notificationMode,
  morning,
  evening,
  checkins,
  instructions,
}: {
  userName: string
  roomName: string
  timezone: string
  notificationMode: NotificationMode
  morning: string
  evening: string
  checkins: boolean
  instructions: string
}) {
  const notifications =
    NOTIFICATION_OPTIONS.find((option) => option.value === notificationMode)?.label ?? "Everything"
  return (
    <div className="space-y-6">
      <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
        {userName ? `${userName}, ` : ""}the room is set up. Opening it will post a welcome note. If
        agents are added, they get one turn to introduce themselves.
      </p>
      <dl className="divide-y divide-line border-y border-line">
        <SummaryRow label="room" value={roomName} />
        <SummaryRow label="time zone" value={timezone.replaceAll("_", " ")} />
        <SummaryRow label="morning" value={`${morning}, weekdays`} />
        <SummaryRow label="evening" value={`${evening}, weekdays`} />
        <SummaryRow label="check-ins" value={checkins ? "On between meetings" : "Off"} />
        <SummaryRow label="notifications" value={notifications} />
        <SummaryRow
          label="instructions"
          value={instructions ? `${instructions.length} characters saved` : "Not set"}
        />
      </dl>
      <div className="border-l-2 border-accent pl-3">
        <p className="text-[12px] leading-relaxed text-muted">
          No agents yet. Once you add one, mention it in the room or let the stand-up host call on
          it. Every tool that changes something waits for a human approval unless you allow it.
        </p>
      </div>
    </div>
  )
}
