"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { errorMessage, fail, field, ok } from "@/lib/actions/shared"
import type { ActionResult } from "@/lib/types"

export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser("/")
  const displayName = field(formData, "displayName")
  const photo = field(formData, "photo")
  const mode = field(formData, "mode")
  const sound = field(formData, "sound") === "on"
  if (displayName.length < 1 || displayName.length > 60) {
    return fail("Display name must be 1 to 60 characters")
  }
  if (!["all", "mentions", "off"].includes(mode)) return fail("Choose a notification option")
  if (photo) {
    const dataUrl = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)
    const remoteUrl = /^https:\/\/[^\s"'<>]{1,500}$/.test(photo)
    if (!dataUrl && !remoteUrl) return fail("Use a PNG, JPEG or WebP image")
    if (dataUrl && photo.length > 300_000) return fail("That image is too large. Pick a smaller one.")
  }
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .maybeSingle()
  const preferences = {
    ...((profile?.preferences as Record<string, unknown>) ?? {}),
    notifications: mode,
    sound,
  }
  const { error } = await admin
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: photo || null,
      preferences,
    })
    .eq("id", user.id)
  if (error) return fail(errorMessage(error))
  revalidatePath("/", "layout")
  return ok("Profile saved")
}
