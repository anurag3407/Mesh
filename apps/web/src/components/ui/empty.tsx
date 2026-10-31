import type { ReactNode } from "react"
import { cn } from "@/lib/format"

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string
  body: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex max-w-md flex-col items-start gap-3 border-l-2 border-line-strong py-2 pl-4",
        className,
      )}
    >
      <h2 className="text-[15px] font-medium text-text">{title}</h2>
      <p className="text-[13px] leading-relaxed text-muted">{body}</p>
      {action}
    </div>
  )
}

export function InlineAlert({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "danger" | "success" | "warning"
  children: ReactNode
}) {
  const toneClass =
    tone === "danger"
      ? "border-danger/40 text-danger"
      : tone === "success"
        ? "border-ok/40 text-ok"
        : tone === "warning"
          ? "border-warn/40 text-warn"
          : "border-line text-muted"
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-sm border bg-panel px-3 py-2 text-[12px] leading-relaxed", toneClass)}
    >
      {children}
    </div>
  )
}
