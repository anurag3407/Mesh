"use client"

import { useActionState, useRef, useState } from "react"
import { updateProfileAction } from "@/lib/actions/profile"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, HelpText, Input } from "@/components/ui/field"
import { InlineAlert } from "@/components/ui/empty"
import { cn } from "@/lib/format"
import type { ActionResult } from "@/lib/types"

const MODES = [
  { value: "all", label: "Everything" },
  { value: "mentions", label: "Only mentions and requests" },
  { value: "off", label: "Nothing" },
] as const

export function ProfileForm({
  email,
  displayName,
  avatarUrl,
  notifications,
  sound,
}: {
  email: string | null
  displayName: string
  avatarUrl: string | null
  notifications: "all" | "mentions" | "off"
  sound: boolean
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updateProfileAction,
    null,
  )
  const [photo, setPhoto] = useState<string | null>(avatarUrl)
  const [preview, setPreview] = useState(displayName)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState(notifications)
  const [soundOn, setSoundOn] = useState(sound)
  const fileInput = useRef<HTMLInputElement>(null)

  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Use a PNG, JPEG or WebP image")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      if (result.length > 300_000) {
        setError("That image is too large. Pick one under about 200 KB.")
        return
      }
      setError(null)
      setPhoto(result)
    }
    reader.onerror = () => setError("That image could not be read")
    reader.readAsDataURL(file)
  }

  return (
    <form action={action} className="max-w-xl space-y-6">
      <input type="hidden" name="photo" value={photo ?? ""} />
      <div className="flex items-center gap-4">
        <Avatar name={preview || displayName} src={photo} kind="human" size="lg" />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInput.current?.click()}
              type="button"
            >
              {photo ? "Replace photo" : "Upload photo"}
            </Button>
            {photo ? (
              <Button
                size="sm"
                variant="quiet"
                type="button"
                onClick={() => {
                  setPhoto(null)
                  if (fileInput.current) fileInput.current.value = ""
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <p className="font-mono text-[10px] text-faint">PNG, JPEG or WebP · under 200 KB</p>
        </div>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={onPhotoChange}
      />

      <Field label="display name" htmlFor="profile-name" hint="shown in rooms and mentions">
        <Input
          id="profile-name"
          name="displayName"
          value={preview}
          maxLength={60}
          required
          onChange={(event) => setPreview(event.target.value)}
        />
      </Field>

      <Field label="email" htmlFor="profile-email" hint="managed by auth">
        <Input id="profile-email" value={email ?? "no email on this account"} disabled readOnly />
      </Field>

      <fieldset>
        <legend className="mb-1.5 font-mono text-[11px] text-muted">notifications</legend>
        <div className="divide-y divide-line border border-line">
          {MODES.map((option) => {
            const active = mode === option.value
            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-[12px]",
                  active ? "bg-raised text-text" : "text-muted hover:bg-raised/60",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  value={option.value}
                  checked={active}
                  onChange={() => setMode(option.value)}
                  className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                />
                {option.label}
              </label>
            )
          })}
        </div>
        <HelpText>
          Alerts show only while this browser tab is open and permitted. Requests and approvals
          always land in the Inbox.
        </HelpText>
      </fieldset>

      <label className="flex items-start gap-2 text-[12px] leading-relaxed text-muted">
        <input
          type="checkbox"
          name="sound"
          checked={soundOn}
          onChange={(event) => setSoundOn(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-[var(--color-accent)]"
        />
        Play a quiet sound for new agent messages while the tab is visible.
      </label>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      {state ? (
        <InlineAlert tone={state.ok ? "success" : "danger"}>
          {state.ok ? (state.message ?? "Profile saved") : state.error}
        </InlineAlert>
      ) : null}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  )
}
