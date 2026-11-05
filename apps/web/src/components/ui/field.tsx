import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react"
import { cn } from "@/lib/format"

const controlClass =
  "w-full rounded-sm border border-[var(--color-control)] bg-panel px-3 text-text outline-none transition-colors placeholder:text-faint focus:border-accent disabled:opacity-50"

export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="font-mono text-[12px] text-muted">{children}</span>
      {hint ? <span className="font-mono text-[11px] text-faint">{hint}</span> : null}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, "h-9 text-[13px]", className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlClass, "min-h-24 py-2 text-[13px] leading-relaxed", className)}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, "h-9 text-[13px]", className)} {...props}>
      {children}
    </select>
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string | null
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} hint={hint}>
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-[12px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function HelpText({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-[12px] leading-relaxed text-faint">{children}</p>
}
