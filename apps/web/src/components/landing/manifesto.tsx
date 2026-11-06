"use client"

import { Fragment, useRef } from "react"
import { AgentBot } from "./agent-bot"
import type { AgentId } from "./agents"
import { gsap, MOTION, useGSAP } from "./gsap"

/** Words, with agent faces dropped inline where a token is an AgentId. */
const TEXT: (string | { face: AgentId })[] = [
  "Most AI tools bolt a chatbot onto a chat window. Everyone talks at once, nobody knows who's on it, and the bot just runs things.",
  "Mesh is the opposite:",
  { face: "ada" },
  "a room with rules. Agents",
  { face: "pixel" },
  "take turns,",
  { face: "bolt" },
  "ask before they act, and",
  { face: "sage" },
  "show up on time.",
]

function Face({ agent }: { agent: AgentId }) {
  return (
    <span
      className="mf-face relative mx-[0.08em] inline-block h-[0.95em] w-[0.95em] translate-y-[0.14em] overflow-hidden rounded-full align-baseline"
      style={{ background: `color-mix(in oklab, var(--color-${agent}) 35%, var(--color-cream-deep))` }}
    >
      <AgentBot agent={agent} className="absolute left-1/2 top-[14%] w-[118%] -translate-x-1/2" />
    </span>
  )
}

export function Manifesto() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        gsap.fromTo(
          ".mf-sheet",
          { clipPath: "inset(7% 4% 0% 4% round 56px)" },
          {
            clipPath: "inset(0% 0% 0% 0% round 0px)",
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "top 15%", scrub: true },
          },
        )

        const tl = gsap.timeline({
          scrollTrigger: { trigger: ".mf-text", start: "top 78%", end: "bottom 50%", scrub: 0.5 },
        })
        tl.fromTo(".mf-word", { opacity: 0.13 }, { opacity: 1, stagger: 0.1, ease: "none", duration: 0.5 })
        gsap.utils.toArray<HTMLElement>(".mf-face").forEach((face) => {
          const words = gsap.utils.toArray<HTMLElement>(".mf-word")
          const index = words.indexOf(face.closest(".mf-word") as HTMLElement)
          tl.from(face, { scale: 0, rotate: -40, ease: "back.out(2.5)", duration: 0.6 }, Math.max(0, index) * 0.1)
        })

        gsap.from(".mf-sign > *", {
          y: 20,
          opacity: 0,
          stagger: 0.08,
          scrollTrigger: { trigger: ".mf-sign", start: "top 90%" },
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} aria-labelledby="manifesto-title" className="relative">
      <div className="mf-sheet l-paper l-section">
        <div className="l-container">
          <span className="l-eyebrow" id="manifesto-title">
            02 — Why Mesh
          </span>
          <p className="mf-text mt-12 max-w-[22ch] text-[clamp(2.25rem,5.2vw,5rem)] font-medium leading-[1.04] tracking-[-0.04em] lg:mt-16">
            {TEXT.map((part, i) =>
              typeof part === "string" ? (
                <Fragment key={i}>
                  {part.split(" ").map((word, j) => (
                    <Fragment key={j}>
                      <span className="mf-word">{word}</span>{" "}
                    </Fragment>
                  ))}
                </Fragment>
              ) : (
                <Fragment key={i}>
                  <span className="mf-word">
                    <Face agent={part.face} />
                  </span>{" "}
                </Fragment>
              ),
            )}
          </p>

          <div className="mf-sign mt-20 flex flex-wrap items-end justify-between gap-8 border-t border-cream-ink/15 pt-8">
            <p className="max-w-[46ch] text-[16px] leading-relaxed text-cream-ink/70">
              The room is the unit of memory, access and turn order. People and agents share the
              feed, the canvas, the board and the clock, and nothing risky happens without a
              human saying yes.
            </p>
            <div className="flex items-end gap-1" aria-hidden>
              {(["ada", "pixel", "bolt", "sage"] as const).map((id) => (
                <AgentBot key={id} agent={id} float className="w-12 sm:w-14" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
