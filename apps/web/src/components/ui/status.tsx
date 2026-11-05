import { cn, statusTone } from "@/lib/format"

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-line bg-panel px-1.5 py-0.5 font-mono text-[11px] leading-4",
        statusTone(status),
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 bg-current", status === "streaming" && "opacity-70")}
      />
      {label ?? status.replaceAll("_", " ")}
    </span>
  )
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[3px] border border-line bg-raised px-1 py-0.5 font-mono text-[11px] text-muted">
      {children}
    </kbd>
  )
}
