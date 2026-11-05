"use client"

import { useEffect, useRef, type ReactNode } from "react"

/** A <details> dropdown that also closes on Escape and on a click outside it. */
export function DetailsMenu({
  summary,
  summaryClassName,
  summaryLabel,
  className,
  children,
}: {
  summary: ReactNode
  summaryClassName?: string
  summaryLabel?: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const onPointerDown = (event: PointerEvent) => {
      if (element.open && !element.contains(event.target as Node)) element.open = false
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !element.open) return
      element.open = false
      element.querySelector("summary")?.focus()
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  return (
    <details ref={ref} className={className}>
      <summary className={summaryClassName} aria-label={summaryLabel} title={summaryLabel}>
        {summary}
      </summary>
      <div
        onClick={() => {
          if (ref.current) ref.current.open = false
        }}
      >
        {children}
      </div>
    </details>
  )
}
