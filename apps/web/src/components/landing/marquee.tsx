"use client"

import { useRef } from "react"
import { gsap, MOTION, ScrollTrigger, useGSAP } from "./gsap"
import type { AgentId } from "./agents"

const ITEMS = [
  "Deterministic turns",
  "Human approval gate",
  "One live canvas",
  "Weekday standups",
  "Task board",
  "Shared inbox",
  "Bring your own bot",
  "Encrypted key vault",
  "Message search",
]
const HUES: AgentId[] = ["ada", "pixel", "bolt", "sage"]

function Spark({ agent }: { agent: AgentId }) {
  return (
    <svg viewBox="0 0 24 24" className="mx-[0.55em] h-[0.5em] w-[0.5em] flex-none" aria-hidden>
      <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill={`var(--color-${agent})`} />
    </svg>
  )
}

function Row() {
  return (
    <div className="flex items-center" aria-hidden>
      {ITEMS.map((item, i) => (
        <span key={item} className="flex items-center whitespace-nowrap">
          <span className={i % 2 ? "l-serif" : ""}>{item}</span>
          <Spark agent={HUES[i % HUES.length]!} />
        </span>
      ))}
    </div>
  )
}

/** Endless capability strip whose speed and direction follow the scroll. */
export function Marquee() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        const loop = gsap.to(".l-marquee-track", { xPercent: -50, duration: 46, ease: "none", repeat: -1 })
        loop.totalTime(loop.duration() * 200)
        let direction = 1

        const trigger = ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate(self) {
            if (self.direction !== direction) direction = self.direction
            const boost = Math.min(1 + Math.abs(self.getVelocity()) / 350, 6)
            gsap.to(loop, { timeScale: direction * boost, duration: 0.25, overwrite: true })
            gsap.to(loop, { timeScale: direction, duration: 1.1, delay: 0.25, overwrite: false })
          },
        })
        return () => trigger.kill()
      })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="overflow-hidden border-y border-line py-7 sm:py-9">
      <p className="sr-only">{ITEMS.join(", ")}</p>
      <div className="l-marquee-track text-[clamp(1.75rem,4.2vw,3.75rem)] font-medium leading-none tracking-[-0.035em] text-text">
        <Row />
        <Row />
      </div>
    </div>
  )
}
