import { createClient } from "@supabase/supabase-js"
import { expect, test as base, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

export interface E2EState {
  baseURL: string
  orgSlug: string
  orgId: string
  generalRoomId: string
  capRoomId: string
  emailA: string
  emailB: string
  approveToolCallId: string
  rejectToolCallId: string
}

let cachedState: E2EState | null = null

export function state(): E2EState {
  if (!cachedState) {
    cachedState = JSON.parse(
      readFileSync(resolve(process.cwd(), ".e2e-state.json"), "utf8"),
    ) as E2EState
  }
  return cachedState
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase service credentials are missing")
  return createClient<any>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Signs in by generating a magic link with the admin API, then visiting it. */
export async function signIn(page: Page, email: string): Promise<void> {
  const client = admin()
  const redirectTo = `${state().baseURL}/auth/complete`
  const { data, error } = await client.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  })
  if (error || !data.properties?.action_link) {
    throw new Error(`generateLink for ${email}: ${error?.message}`)
  }
  await page.goto(data.properties.action_link)
  await page.waitForURL(
    (url) => url.origin === new URL(state().baseURL).origin && !url.pathname.startsWith("/auth"),
    { timeout: 60_000 },
  )
}

export async function openRoom(page: Page, roomId: string): Promise<void> {
  await page.goto(`/${state().orgSlug}/r/${roomId}`)
  await expect(page.getByTestId("composer")).toBeVisible({ timeout: 30_000 })
}

export async function send(page: Page, content: string): Promise<void> {
  const composer = page.getByTestId("composer")
  await composer.fill(content)
  await page.getByTestId("send-message").click()
}

export const test = base
export { expect }
