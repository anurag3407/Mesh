"use client"

import { useEffect, useRef, type CSSProperties, type RefObject } from "react"
import { AGENT_BY_ID, type AgentId } from "./agents"

export type BotMood = "idle" | "happy" | "sleep"

/* ------------------------------------------------------------------ */
/* One shared pointer listener drives every bot's eyes.                */
/* ------------------------------------------------------------------ */

type Watcher = (x: number, y: number) => void
const watchers = new Set<Watcher>()
let frame = 0
let px = 0
let py = 0

function onPointerMove(event: PointerEvent) {
  px = event.clientX
  py = event.clientY
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    watchers.forEach((watch) => watch(px, py))
  })
}

function useLookAt(ref: RefObject<SVGSVGElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    if (!window.matchMedia("(pointer: fine)").matches) return

    const watch: Watcher = (x, y) => {
      const rect = el.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      const dx = x - (rect.left + rect.width / 2)
      const dy = y - (rect.top + rect.height * 0.45)
      const reach = Math.min(Math.hypot(dx, dy), 420) / 420
      const angle = Math.atan2(dy, dx)
      el.style.setProperty("--lx", `${(Math.cos(angle) * reach * 7).toFixed(2)}px`)
      el.style.setProperty("--ly", `${(Math.sin(angle) * reach * 5).toFixed(2)}px`)
      el.style.setProperty("--lr", `${Math.max(-5, Math.min(5, dx / 60)).toFixed(2)}deg`)
    }

    if (watchers.size === 0) window.addEventListener("pointermove", onPointerMove, { passive: true })
    watchers.add(watch)
    return () => {
      watchers.delete(watch)
      if (watchers.size === 0) window.removeEventListener("pointermove", onPointerMove)
    }
  }, [ref, enabled])
}

/* ------------------------------------------------------------------ */
/* Per-agent silhouettes: what sits on top of the head.                */
/* ------------------------------------------------------------------ */

function Accessory({ agent }: { agent: AgentId }) {
  switch (agent) {
    case "ada":
      return (
        <g className="b-accessory">
          <path d="M80 38 L80 16" className="b-shade-stroke" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="80" cy="12" r="14" className="b-body b-glow" opacity="0.22" />
          <circle cx="80" cy="12" r="8" className="b-body" />
          <circle cx="77" cy="9" r="2.6" className="b-glint" opacity="0.7" />
        </g>
      )
    case "pixel":
      return (
        <g className="b-accessory">
          <path d="M38 62 Q34 22 48 18 Q60 18 74 40 Z" className="b-body" />
          <path d="M45 52 Q44 30 50 28 Q57 29 64 40 Z" className="b-cheek" opacity="0.7" />
          <path d="M122 62 Q126 22 112 18 Q100 18 86 40 Z" className="b-body" />
          <path d="M115 52 Q116 30 110 28 Q103 29 96 40 Z" className="b-cheek" opacity="0.7" />
        </g>
      )
    case "bolt":
      return (
        <g className="b-accessory">
          <path
            d="M88 0 L66 26 L80 26 L71 44 L96 16 L82 16 L92 0 Z"
            className="b-body b-shade-stroke-thin"
            strokeLinejoin="round"
          />
        </g>
      )
    case "sage":
      return (
        <g className="b-accessory">
          <path d="M80 40 C80 30 80 24 82 16" className="b-shade-stroke" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M81 24 C70 12 56 13 53 22 C62 30 74 30 81 24 Z" className="b-body" />
          <path d="M82 18 C88 5 102 3 108 10 C101 19 90 21 82 18 Z" className="b-shade" />
        </g>
      )
  }
}

/* ------------------------------------------------------------------ */

const BLINK_DELAY: Record<AgentId, string> = { ada: "0s", pixel: "1.4s", bolt: "2.7s", sage: "3.9s" }

export interface AgentBotProps {
  agent: AgentId
  mood?: BotMood
  /** Eyes and body follow the pointer. */
  track?: boolean
  /** Gentle idle bob. */
  float?: boolean
  /** Right arm waves on a loop. */
  wave?: boolean
  /** Accessible name. Without one the bot is decorative. */
  label?: string
  className?: string
  style?: CSSProperties
}

export function AgentBot({
  agent,
  mood = "idle",
  track = false,
  float = false,
  wave = false,
  label,
  className = "",
  style,
}: AgentBotProps) {
  const ref = useRef<SVGSVGElement>(null)
  useLookAt(ref, track)
  const info = AGENT_BY_ID[agent]

  return (
    <svg
      ref={ref}
      viewBox="0 0 160 170"
      className={`bot ${className}`}
      data-agent={agent}
      data-mood={mood}
      data-float={float ? "" : undefined}
      data-wave={wave ? "" : undefined}
      style={
        {
          "--bot-c": info.color,
          "--blink-delay": BLINK_DELAY[agent],
          "--bob-delay": `calc(${BLINK_DELAY[agent]} * -0.6)`,
          ...style,
        } as CSSProperties
      }
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      focusable="false"
    >
      <ellipse className="b-shadow" cx="80" cy="164" rx="36" ry="5" />
      <g className="b-float">
        <g className="b-tilt">
          <Accessory agent={agent} />

          <g className="b-arm b-arm-l">
            <ellipse cx="30" cy="114" rx="9" ry="15" transform="rotate(24 30 114)" className="b-shade" />
          </g>
          <g className="b-arm b-arm-r">
            <ellipse cx="130" cy="114" rx="9" ry="15" transform="rotate(-24 130 114)" className="b-shade" />
          </g>

          <ellipse cx="62" cy="154" rx="13" ry="8" className="b-shade" />
          <ellipse cx="98" cy="154" rx="13" ry="8" className="b-shade" />

          <rect x="30" y="34" width="100" height="120" rx="46" className="b-body" />
          <ellipse cx="58" cy="50" rx="17" ry="7" transform="rotate(-18 58 50)" className="b-hi" />

          <rect x="42" y="56" width="76" height="58" rx="25" className="b-visor" />
          <path d="M50 70 C56 60 80 58 104 62 C88 62 64 63 52 74 Z" className="b-sheen" />

          <g className="b-look">
            <g className="b-eyes-open">
              <rect x="57" y="70" width="13" height="24" rx="6.5" className="b-eye" />
              <rect x="90" y="70" width="13" height="24" rx="6.5" className="b-eye" />
              <circle cx="61" cy="75.5" r="2.6" className="b-glint" />
              <circle cx="94" cy="75.5" r="2.6" className="b-glint" />
            </g>
            <g className="b-eyes-happy">
              <path d="M56 87 Q63.5 72 71 87" className="b-eye-stroke" />
              <path d="M89 87 Q96.5 72 104 87" className="b-eye-stroke" />
            </g>
            <g className="b-eyes-sleep">
              <path d="M56 83 Q63.5 90 71 83" className="b-eye-stroke" />
              <path d="M89 83 Q96.5 90 104 83" className="b-eye-stroke" />
            </g>
            <path d="M74 101 Q80 106.5 86 101" className="b-eye-stroke b-mouth" />
          </g>

          <ellipse cx="50" cy="123" rx="8" ry="4.5" className="b-cheek" />
          <ellipse cx="110" cy="123" rx="8" ry="4.5" className="b-cheek" />

          <rect x="68" y="132" width="24" height="9" rx="4.5" className="b-shade" />
          <circle cx="74" cy="136.5" r="2" className="b-eye" />
        </g>
      </g>
      <g className="b-zzz">
        <text x="122" y="40" fontSize="15">z</text>
        <text x="134" y="24" fontSize="11">z</text>
      </g>
    </svg>
  )
}
