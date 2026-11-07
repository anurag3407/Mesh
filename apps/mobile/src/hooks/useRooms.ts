import { useEffect, useState, useCallback } from "react"
import { supabase } from "../core/supabase"
import type { Room } from "../types"

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [orgSlug, setOrgSlug] = useState<string>("default")
  const [loading, setLoading] = useState(true)

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch current org
      const { data: orgData } = await supabase.from("orgs").select("id, slug").limit(1).maybeSingle()
      if (!orgData) return
      setOrgSlug(orgData.slug)

      // 2. Fetch rooms
      const { data: roomData, error } = await supabase
        .from("rooms")
        .select("id, org_id, name, kind, turn_mode, system_directive, timezone")
        .eq("org_id", orgData.id)
        .order("kind", { ascending: true })
        .order("name", { ascending: true })

      if (error) throw error

      if (roomData) {
        setRooms(
          roomData.map((r: any) => ({
            id: r.id,
            orgId: r.org_id,
            name: r.name,
            kind: r.kind,
            turnMode: r.turn_mode,
            systemDirective: r.system_directive,
            timezone: r.timezone || "UTC",
          }))
        )
      }
    } catch (err) {
      console.error("[useRooms] fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()

    // Realtime channel to refresh room list on room creations/updates
    const channel = supabase
      .channel("rooms:list")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        fetchRooms()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchRooms])

  return { rooms, orgSlug, loading, refresh: fetchRooms }
}
