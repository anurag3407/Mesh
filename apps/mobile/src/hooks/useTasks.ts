import { useCallback, useEffect, useState } from "react"
import { supabase } from "../core/supabase"
import type { TaskItem } from "../types"

export function useTasks(roomId?: string) {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("tasks")
        .select(
          "id, number, title, description, status, kind, priority, assignee_agent_id, assignee_user_id, budget_turns, turns_used, cost_usd, unblock_needs"
        )
        .order("created_at", { ascending: false })
        .limit(50)

      if (roomId) {
        query = query.eq("room_id", roomId)
      }

      const { data, error } = await query
      if (error) throw error

      if (data) {
        setTasks(
          data.map((t: any) => ({
            id: t.id,
            number: t.number,
            title: t.title,
            description: t.description,
            status: t.status,
            kind: t.kind,
            priority: t.priority,
            assigneeAgentId: t.assignee_agent_id,
            assigneeUserId: t.assignee_user_id,
            budgetTurns: t.budget_turns ?? 12,
            turnsUsed: t.turns_used ?? 0,
            costUsd: Number(t.cost_usd ?? 0),
            unblockNeeds: t.unblock_needs,
          }))
        )
      }
    } catch (err) {
      console.error("[useTasks] fetchTasks error:", err)
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    fetchTasks()

    const channel = supabase
      .channel("tasks:live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        fetchTasks()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTasks])

  return { tasks, loading, refresh: fetchTasks }
}
