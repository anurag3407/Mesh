"use client"

import Link from "next/link"
import { useRef, type CSSProperties } from "react"
import { Plus } from "lucide-react"
import { AgentBot } from "./agent-bot"
import { AGENTS } from "./agents"
import { gsap, MOTION_DESKTOP, MOTION_MOBILE, ScrollTrigger, useGSAP } from "./gsap"

function Intro({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <span className="l-eyebrow">01 — The crew</span>
      <h2 className="l-h2 mt-7">
        Agents with <span className="l-serif">a personality</span> and a job.
      </h2>
      <p className="l-lead mt-7 max-w-[42ch]">
        Every agent has a name, a model, a role and a place in the turn order. Start with a crew
        like this one, or build your own on any model you hold a key for.
      </p>
      <p className="crew-count mt-12 hidden font-mono text-[12px] text-faint lg:block">
        Scroll to meet them <span aria-hidden>→</span>
      </p>
    </div>
  )
}

export function Crew() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      const q = gsap.utils.selector(root)

      mm.add(MOTION_DESKTOP, () => {
        const track = q(".crew-track")[0] as HTMLElement
        const distance = () => track.scrollWidth - window.innerWidth

        gsap.set(track, { overflow: "visible" })
        const slide = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            pin: q(".crew-pin")[0],
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        })

        q(".crew-card").forEach((card) => {
          const bot = card.querySelector(".crew-bot")
          const svg = card.querySelector(".bot")
          if (!bot || !svg) return
          gsap.fromTo(
            bot,
            { xPercent: 22, rotate: 8 },
            {
              xPercent: -22,
              rotate: -6,
              ease: "none",
              scrollTrigger: { trigger: card, containerAnimation: slide, start: "left right", end: "right left", scrub: true },
            },
          )
          gsap.from(card.querySelectorAll(".crew-reveal"), {
            y: 40,
            opacity: 0,
            stagger: 0.07,
            scrollTrigger: { trigger: card, containerAnimation: slide, start: "left 80%", toggleActions: "play none none reverse" },
          })
          // The agent nearest the centre of the screen waves hello.
          ScrollTrigger.create({
            trigger: card,
            containerAnimation: slide,
            start: "left 60%",
            end: "right 40%",
            onToggle: (self) => svg.toggleAttribute("data-wave", self.isActive),
          })
        })
      })

      mm.add(MOTION_MOBILE, () => {
        gsap.from(q(".crew-card"), {
          y: 60,
          opacity: 0,
          stagger: 0.08,
          scrollTrigger: { trigger: q(".crew-track")[0], start: "top 85%" },
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="crew" className="relative">
      <div className="crew-pin flex flex-col justify-center py-28 lg:min-h-screen lg:py-0">
        <Intro className="l-container lg:hidden" />

        <div className="crew-track mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 sm:px-8 lg:mt-0 lg:snap-none lg:gap-7 lg:pb-0 lg:pl-[max(48px,calc((100vw-1320px)/2+48px))] lg:pr-[12vw] [scrollbar-width:none]">
          <Intro className="hidden w-[min(520px,38vw)] flex-none self-center pr-10 lg:block" />

          {AGENTS.map((agent, i) => (
            <article
              key={agent.id}
              className="crew-card relative flex h-[min(640px,76vh)] min-h-[520px] w-[min(420px,84vw)] flex-none snap-center flex-col overflow-hidden rounded-[36px] border p-7 sm:p-9"
              style={
                {
                  "--agent": agent.color,
                  background: "color-mix(in oklab, var(--agent) 13%, var(--color-panel))",
                  borderColor: "color-mix(in oklab, var(--agent) 26%, transparent)",
                } as CSSProperties
              }
            >
              <div className="crew-reveal flex items-center justify-between">
                <span className="font-mono text-[12px] text-faint">0{i + 1} / 04</span>
                <span className="l-chip l-agent-chip">{agent.handle}</span>
              </div>

              <div className="relative flex flex-1 items-center justify-center">
                <div
                  aria-hidden
                  className="absolute aspect-square w-[78%] rounded-full"
                  style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--agent) 30%, transparent), transparent)" }}
                />
                <div className="crew-bot relative w-[58%]">
                  <AgentBot agent={agent.id} track float label={`${agent.name}, the ${agent.role.toLowerCase()}`} />
                </div>
              </div>

              <div>
                <p className="crew-reveal font-mono text-[11.5px] uppercase tracking-[0.14em]" style={{ color: agent.color }}>
                  {agent.role}
                </p>
                <h3 className="crew-reveal l-serif mt-1 text-[clamp(3.5rem,5vw,4.75rem)] leading-[0.95] text-text">
                  {agent.name}
                </h3>
                <p className="crew-reveal mt-4 text-[15.5px] leading-relaxed text-text/80">&ldquo;{agent.quote}&rdquo;</p>
                <ul className="crew-reveal mt-6 flex flex-wrap gap-1.5">
                  {agent.traits.map((t) => (
                    <li key={t} className="l-chip">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}

          <Link
            href="/signup"
            className="crew-card group flex h-[min(640px,76vh)] min-h-[520px] w-[min(420px,84vw)] flex-none snap-center flex-col justify-between rounded-[36px] border border-dashed border-line-strong p-7 transition-colors hover:border-text sm:p-9"
          >
            <span className="font-mono text-[12px] text-faint">05 / you</span>
            <span className="grid h-24 w-24 place-items-center self-center rounded-full border border-line-strong transition-transform duration-500 group-hover:rotate-90 group-hover:border-text">
              <Plus className="h-8 w-8" />
            </span>
            <span>
              <span className="l-serif block text-[clamp(3rem,4.4vw,4.25rem)] leading-[0.95]">Your agent</span>
              <span className="mt-4 block text-[15.5px] leading-relaxed text-muted">
                Pick a provider, paste a key, give it a role. It joins the turn order and
                introduces itself in the room.
              </span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}
