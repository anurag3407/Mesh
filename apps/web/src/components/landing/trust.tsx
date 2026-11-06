"use client"

import { useRef } from "react"
import { AgentBot } from "./agent-bot"
import { gsap, MOTION, useGSAP } from "./gsap"

const ROWS = [
  {
    figure: "AES-256",
    label: "Keys encrypted at rest",
    body: "Provider keys, webhook secrets, MCP headers and tool connection strings are sealed with AES-256-GCM. The ciphertext never reaches the browser.",
  },
  {
    figure: "5:00",
    label: "Silence means no",
    body: "Danger tools wait for a room admin's decision. If nobody answers within five minutes, the request is rejected.",
  },
  {
    figure: "1×",
    label: "Agent keys shown once",
    body: "Agent API keys are displayed a single time, then stored only as SHA-256 hashes with a short lookup prefix.",
  },
  {
    figure: "***",
    label: "Secrets redacted",
    body: "Every model, bot and tool output is scrubbed for common secret formats before it's stored or broadcast.",
  },
]

export function Trust() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        gsap.from(".tr-head > *", {
          y: 40,
          opacity: 0,
          stagger: 0.1,
          scrollTrigger: { trigger: ".tr-head", start: "top 80%" },
        })
        gsap.utils.toArray<HTMLElement>(".tr-row").forEach((row) => {
          const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: "top 86%" } })
          tl.from(row.querySelector(".tr-rule"), { scaleX: 0, duration: 1.2, ease: "expo.inOut" })
            .from(row.querySelector(".tr-figure"), { yPercent: 100, duration: 1, ease: "expo.out" }, 0.25)
            .from(row.querySelectorAll(".tr-copy"), { y: 20, opacity: 0, stagger: 0.08 }, 0.35)
        })
        gsap.fromTo(
          ".tr-guard",
          { y: 60 },
          {
            y: -60,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
          },
        )
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="security" className="l-section relative overflow-hidden bg-ink">
      <div className="l-container grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <div className="tr-head lg:sticky lg:top-32 lg:self-start">
          <span className="l-eyebrow">05 — Security</span>
          <h2 className="l-h2 mt-7">
            Agents are helpful. <span className="l-serif text-bolt">Keys are sacred.</span>
          </h2>
          <p className="l-lead mt-7 max-w-[40ch]">
            Sayabot is built so the cute part never gets near the dangerous part. Row-level security
            on every table, and you can self-host the whole thing.
          </p>
          <div className="tr-guard mt-14 hidden w-40 lg:block">
            <AgentBot agent="bolt" track float label="Bolt standing guard" />
          </div>
        </div>

        <ul>
          {ROWS.map((row) => (
            <li key={row.label} className="tr-row relative grid gap-4 pb-12 pt-10 sm:grid-cols-[minmax(0,12.5rem)_1fr] sm:gap-10">
              <span aria-hidden className="tr-rule absolute inset-x-0 top-0 h-px origin-left bg-line-strong" />
              <span className="block overflow-hidden">
                <span className="tr-figure block whitespace-nowrap font-mono text-[clamp(2rem,3vw,2.75rem)] font-medium leading-none tracking-[-0.04em] text-text">
                  {row.figure}
                </span>
              </span>
              <div>
                <h3 className="tr-copy text-[19px] font-medium tracking-[-0.02em]">{row.label}</h3>
                <p className="tr-copy mt-2.5 max-w-[48ch] text-[15px] leading-relaxed text-muted">{row.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
