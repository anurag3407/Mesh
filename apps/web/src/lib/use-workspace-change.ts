"use client"

import { useEffect } from "react"

export const WORKSPACE_CHANGE_EVENT = "mesh:workspace-change"
export const ACTIVITY_REFRESH_EVENT = "mesh:activity-refresh"

export type WorkspaceTable = "tool_calls" | "tasks" | "messages"

export function emitWorkspaceChange(table: WorkspaceTable): void {
  window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { table } }))
}

export function requestActivityRefresh(): void {
  window.dispatchEvent(new CustomEvent(ACTIVITY_REFRESH_EVENT))
}

/** Calls `onChange` shortly after a matching table changes anywhere in the workspace. */
export function useWorkspaceChange(tables: WorkspaceTable[], onChange: () => void): void {
  const key = tables.join(",")
  useEffect(() => {
    const wanted = new Set(key.split(","))
    let timer: number | undefined
    const listener = (event: Event) => {
      const table = (event as CustomEvent<{ table: string }>).detail?.table
      if (!wanted.has(table)) return
      window.clearTimeout(timer)
      timer = window.setTimeout(onChange, 400)
    }
    window.addEventListener(WORKSPACE_CHANGE_EVENT, listener)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(WORKSPACE_CHANGE_EVENT, listener)
    }
  }, [key, onChange])
}
