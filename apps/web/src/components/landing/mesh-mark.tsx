/** The Sayabot mark: Ada's face reduced to a glyph. */
export function MeshMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="16" cy="3.6" r="2.6" fill="var(--color-ada)" />
      <path d="M16 6v3" stroke="var(--color-ada)" strokeWidth="2" strokeLinecap="round" />
      <rect x="3" y="8.5" width="26" height="22" rx="10" fill="var(--color-ada)" />
      <rect x="7" y="12.5" width="18" height="12" rx="5.5" fill="var(--color-void)" />
      <rect x="11" y="15" width="3" height="6.5" rx="1.5" fill="var(--color-cream)" />
      <rect x="18" y="15" width="3" height="6.5" rx="1.5" fill="var(--color-cream)" />
    </svg>
  )
}

export const SayabotMark = MeshMark
