import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env"

export async function createSupabaseServerClient(): Promise<SupabaseClient<any>> {
  const cookieStore = await cookies()
  return createServerClient<any>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server components cannot write cookies; the proxy refreshes them.
        }
      },
    },
  })
}
