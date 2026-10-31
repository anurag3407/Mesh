import type { ReactNode } from "react"
import { cn } from "@/lib/format"

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("border-t border-line pt-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-[15px] font-medium">{title}</h2>
          {description ? (
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}
