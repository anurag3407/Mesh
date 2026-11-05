"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/format"

const TOAST_EVENT = "mesh:toast"
const DEFAULT_DURATION_MS = 5_000
const MAX_VISIBLE = 4

export interface ToastInput {
  message: string
  tone?: "neutral" | "success" | "danger" | "warning"
  action?: { label: string; href?: string; onClick?: () => void }
  durationMs?: number
}

interface ToastEntry extends ToastInput {
  id: number
}

export function showToast(input: ToastInput): void {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: input }))
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  useEffect(() => {
    const listener = (event: Event) => {
      const input = (event as CustomEvent<ToastInput>).detail
      const id = nextId.current++
      setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { ...input, id }])
      window.setTimeout(() => dismiss(id), input.durationMs ?? DEFAULT_DURATION_MS)
    }
    window.addEventListener(TOAST_EVENT, listener)
    return () => window.removeEventListener(TOAST_EVENT, listener)
  }, [dismiss])

  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] flex flex-col items-end gap-2 md:inset-x-auto md:right-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-raised px-3 py-2.5 text-[13px] leading-snug text-text shadow-[0_12px_32px_rgba(0,0,0,0.45)]",
            toast.tone === "danger"
              ? "border-danger/50"
              : toast.tone === "warning"
                ? "border-warn/50"
                : toast.tone === "success"
                  ? "border-ok/50"
                  : "border-line-strong",
          )}
        >
          <span className="min-w-0 flex-1">{toast.message}</span>
          {toast.action?.href ? (
            <Link
              href={toast.action.href}
              onClick={() => dismiss(toast.id)}
              className="shrink-0 font-medium text-accent underline underline-offset-4"
            >
              {toast.action.label}
            </Link>
          ) : toast.action?.onClick ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick?.()
                dismiss(toast.id)
              }}
              className="shrink-0 font-medium text-accent underline underline-offset-4"
            >
              {toast.action.label}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
            className="-m-1 grid h-7 w-7 shrink-0 place-items-center rounded-sm text-muted hover:text-text"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
