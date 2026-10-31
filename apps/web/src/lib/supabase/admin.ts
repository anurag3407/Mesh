import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getServiceRoleKey, getSupabaseUrl } from "@/lib/env"

let admin: SupabaseClient<any> | null = null

export function createAdminClient() {
  if (!admin) {
    admin = createClient<any>(getSupabaseUrl(), getServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }
  return admin
}
