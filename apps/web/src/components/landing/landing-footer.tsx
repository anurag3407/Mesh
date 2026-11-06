"use client"

import { useRef } from "react"
import { AgentBot } from "./agent-bot"
import { gsap, MOTION, useGSAP } from "./gsap"
import { SiteFooterLinks } from "./site-footer"

/** Footer with an oversized wordmark and Sage napping on top of it. */
export function LandingFooter() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        gsap.from(".ft-letter", {
          yPercent: 100,
          stagger: 0.06,
          duration: 1.4,
          ease: "expo.out",
          scrollTrigger: { trigger: ".ft-word", start: "top 95%" },
        })
        gsap.from(".ft-peek", {
          yPercent: 100,
          duration: 1,
          ease: "back.out(1.6)",
          delay: 0.5,
          scrollTrigger: { trigger: ".ft-word", start: "top 95%" },
        })
      })
    },
    { scope: root },
  )

  return (
    <footer ref={root} className="relative bg-void pt-10">
      <SiteFooterLinks />
      <div className="ft-word relative overflow-hidden pt-[6vw]" aria-hidden>
        <div className="l-container">
          {/* em units below are relative to the wordmark size, so Sage stays seated at any width */}
          <div className="flex select-none justify-center text-[clamp(7rem,27vw,26rem)] font-semibold leading-[0.78] tracking-[-0.07em] text-raised">
            {"mesh".split("").map((ch, i) => (
              <span key={i} className="ft-letter relative inline-block">
                {ch}
                {i === 0 && (
                  <span className="ft-peek absolute bottom-[0.515em] left-1/2 block w-[0.3em] -translate-x-1/2">
                    <AgentBot agent="sage" mood="sleep" />
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
