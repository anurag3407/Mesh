/** The Sayabot mark: Pocket Saya cute bot mascot */
export function SayabotMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      <title>Sayabot</title>
      {/* Top antenna orb and stem */}
      <g fill="var(--color-accent, #ff7a45)">
        <circle cx="128" cy="26" r="14" />
        <circle cx="125" cy="22" r="4.5" fill="#ffa885" />
        <rect x="124" y="36" width="8" height="22" rx="4" />
        {/* Left and right ear audio pods */}
        <rect x="22" y="98" width="22" height="48" rx="11" />
        <rect x="212" y="98" width="22" height="48" rx="11" />
        {/* Head chassis */}
        <rect x="36" y="54" width="184" height="152" rx="60" />
      </g>
      {/* Dark glossy visor */}
      <rect x="52" y="70" width="152" height="120" rx="44" fill="#0b0e0c" />
      {/* Blushing cheeks */}
      <ellipse cx="74" cy="142" rx="8" ry="4" fill="#ff7a45" opacity="0.45" />
      <ellipse cx="182" cy="142" rx="8" ry="4" fill="#ff7a45" opacity="0.45" />
      {/* Cute eyes & warm smile */}
      <ellipse cx="94" cy="122" rx="16" ry="22" fill="#ffffff" />
      <ellipse cx="162" cy="122" rx="16" ry="22" fill="#ffffff" />
      <path
        d="M 118 144 Q 128 156 138 144"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* Eye depth and cute sparkle glints */}
      <circle cx="94" cy="122" r="9" fill="#0b0e0c" opacity="0.12" />
      <circle cx="162" cy="122" r="9" fill="#0b0e0c" opacity="0.12" />
      <circle cx="99" cy="115" r="6.5" fill="#ffffff" />
      <circle cx="90" cy="129" r="3.2" fill="#ffffff" />
      <circle cx="167" cy="115" r="6.5" fill="#ffffff" />
      <circle cx="158" cy="129" r="3.2" fill="#ffffff" />
    </svg>
  )
}

export const MeshMark = SayabotMark
