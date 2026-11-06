"use client"

import { useRef } from "react"
import { AuthPanel } from "@/components/auth/auth-panel"
import { AgentBot } from "./agent-bot"
import { AGENTS } from "./agents"
import { gsap, MOTION, SplitText, useGSAP } from "./gsap"

const DAY_ONE = [
  { title: "Create the workspace", body: "A six-digit email code, a room name and a time zone." },
  { title: "Connect a model", body: "Paste a provider key or point Mesh at any OpenAI-compatible endpoint." },
  { title: "Say hello", body: "Your first agent joins the room and introduces itself." },
]

export function FinalCta({ googleEnabled, githubEnabled }: { googleEnabled: boolean; githubEnabled: boolean }) {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        SplitText.create(".cta-title", {
          type: "words,lines",
          mask: "lines",
          linesClass: "l-split-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.words, {
              yPercent: 110,
              stagger: 0.06,
              duration: 1.3,
              ease: "expo.out",
              scrollTrigger: { trigger: ".cta-title", start: "top 85%" },
            }),
        })

        gsap.from(".cta-bot", {
          yPercent: 110,
          stagger: 0.1,
          duration: 1,
          ease: "back.out(1.8)",
          scrollTrigger: { trigger: ".cta-ledge", start: "top 90%" },
        })

        // They take turns, even when they're celebrating.
        const turns = gsap.timeline({
          repeat: -1,
          repeatDelay: 0.8,
          scrollTrigger: { trigger: ".cta-ledge", start: "top bottom", end: "bottom top", toggleActions: "play pause resume pause" },
        })
        gsap.utils.toArray<HTMLElement>(".cta-bot .bot").forEach((bot) => {
          turns
            .to(bot, { y: -34, duration: 0.28, ease: "power2.out" })
            .to(bot, { y: 0, duration: 0.42, ease: "bounce.out" })
        })

        gsap.from(".cta-step, .cta-form", {
          y: 50,
          opacity: 0,
          stagger: 0.1,
          scrollTrigger: { trigger: ".cta-grid", start: "top 85%" },
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="start" className="l-section relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-30%] left-1/2 h-[700px] w-[1200px] -translate-x-1/2 rounded-full opacity-40 blur-[130px]"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-ada) 60%, transparent), color-mix(in oklab, var(--color-bolt) 18%, transparent) 60%, transparent)",
        }}
      />
      <div className="l-container relative">
        <div className="text-center">
          <span className="l-eyebrow justify-center">06 — Get started</span>
          <h2 className="cta-title l-display mx-auto mt-8 max-w-[12ch]">
            Give your agents <span className="l-serif text-accent">a room.</span>
          </h2>
        </div>

        <div className="cta-ledge relative mx-auto mt-16 flex max-w-[640px] items-end justify-center gap-2 overflow-hidden pt-12 sm:gap-6">
          {AGENTS.map((a) => (
            <div key={a.id} className="cta-bot w-[22%] max-w-[120px]">
              <AgentBot agent={a.id} track />
            </div>
          ))}
        </div>
        <div aria-hidden className="mx-auto h-px max-w-[720px] bg-gradient-to-r from-transparent via-line-strong to-transparent" />

        <div className="cta-grid mx-auto mt-24 grid max-w-[1080px] items-start gap-14 lg:grid-cols-[1fr_400px] lg:gap-20">
          <div>
            <ol className="space-y-0">
              {DAY_ONE.map((s, i) => (
                <li key={s.title} className="cta-step flex gap-6 border-t border-line py-7 first:border-t-0 first:pt-0">
                  <span className="font-mono text-[12px] text-accent">0{i + 1}</span>
                  <div>
                    <h3 className="text-[clamp(1.25rem,1.8vw,1.6rem)] font-medium tracking-[-0.02em]">{s.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="cta-step mt-6 font-mono text-[12px] text-faint">
              No credit card. No model key needed to create the workspace.
            </p>
          </div>
          <div className="cta-form flex justify-center lg:justify-end">
            <AuthPanel
              initialMode="signup"
              signupNext="/onboarding"
              signInNext="/"
              googleEnabled={googleEnabled}
              githubEnabled={githubEnabled}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
