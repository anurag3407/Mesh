"use client"

import { useRef, type CSSProperties, type ReactNode } from "react"
import { ArrowRight, Check, ShieldCheck } from "lucide-react"
import { AgentBot } from "./agent-bot"
import { AGENT_BY_ID, type AgentId } from "./agents"
import { gsap, MOTION, SplitText, useGSAP } from "./gsap"

const PEEKERS: { id: AgentId; left: string }[] = [
  { id: "ada", left: "7%" },
  { id: "pixel", left: "25%" },
  { id: "bolt", left: "62%" },
  { id: "sage", left: "80%" },
]

const QUEUE: AgentId[] = ["ada", "pixel", "bolt"]

const agentVar = (id: AgentId) => ({ "--agent": AGENT_BY_ID[id].color }) as CSSProperties

function Avatar({ id }: { id: AgentId | "you" }) {
  if (id === "you") {
    return (
      <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-cream font-mono text-[11px] font-medium text-cream-ink">
        SR
      </span>
    )
  }
  return (
    <span
      className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-full"
      style={{ background: `color-mix(in oklab, ${AGENT_BY_ID[id].color} 18%, var(--color-ink))` }}
    >
      <AgentBot agent={id} className="mt-2 h-9 w-9" />
    </span>
  )
}

function Message({
  who,
  name,
  time,
  step = false,
  children,
}: {
  who: AgentId | "you"
  name: string
  time: string
  /** Part of the looping turn sequence. */
  step?: boolean
  children: ReactNode
}) {
  return (
    <div className="hero-msg flex gap-3" data-who={who} data-step={step ? "" : undefined}>
      <Avatar id={who} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[13px] font-medium"
            style={{ color: who === "you" ? "var(--color-text)" : AGENT_BY_ID[who].color }}
          >
            {name}
          </span>
          <span className="font-mono text-[10.5px] text-faint">{time}</span>
        </div>
        <div className="mt-0.5 text-[13.5px] leading-relaxed text-text/90">{children}</div>
      </div>
    </div>
  )
}

const Mention = ({ id }: { id: AgentId }) => (
  <span className="font-medium" style={{ color: AGENT_BY_ID[id].color }}>
    @{id}
  </span>
)

export function Hero() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".l-hero-reveal", { opacity: 1, animation: "none" })
      })

      mm.add(MOTION, () => {
        gsap.set(".l-hero-reveal", { opacity: 1, animation: "none" })

        /* ---------- intro ---------- */
        const intro = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.2 } })
        intro.from(".hero-eyebrow", { y: 16, opacity: 0, duration: 0.8 }, 0.1)

        SplitText.create(".hero-title", {
          type: "lines,words",
          mask: "lines",
          linesClass: "l-split-line",
          autoSplit: true,
          onSplit(self) {
            return intro.from(self.words, { yPercent: 115, stagger: 0.055, duration: 1.3 }, 0.15)
          },
        })

        intro
          .from(".hero-lead", { y: 24, opacity: 0 }, 0.55)
          .from(".hero-cta > *", { y: 20, opacity: 0, stagger: 0.08 }, 0.7)
          .from(".hero-stage", { y: 90, opacity: 0, duration: 1.6 }, 0.6)
          .from(
            ".hero-peeker",
            { yPercent: 70, duration: 0.9, stagger: 0.09, ease: "back.out(2.2)" },
            1.25,
          )
          .from(".hero-hand", { scale: 0, duration: 0.5, stagger: 0.04, ease: "back.out(3)" }, 1.55)

        /* ---------- scroll ---------- */
        gsap.fromTo(
          ".hero-window",
          { rotateX: 16, scale: 0.92 },
          {
            rotateX: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: ".hero-stage", start: "top 95%", end: "top 25%", scrub: 0.6 },
          },
        )
        gsap.to(".hero-copy", {
          yPercent: -18,
          opacity: 0.25,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "45% top", scrub: true },
        })
        gsap.to(".hero-glow", {
          yPercent: 30,
          scale: 1.2,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        })

        /* ---------- the room taking turns, on a loop ---------- */
        const q = gsap.utils.selector(root)
        const msgs = q(".hero-msg[data-step]")
        const chip = (id: AgentId) => q(`.hero-chip[data-agent='${id}']`)
        const hop = (id: AgentId) => q(`.hero-peeker[data-agent='${id}'] .bot`)

        const room = gsap.timeline({ repeat: -1, repeatDelay: 1.2, delay: 2.2, defaults: { duration: 0.5 } })
        room.set(msgs, { opacity: 0, y: 14 })
        room.set(".hero-approve", { attr: { "data-state": "pending" } })
        room.set(".hero-canvas-line", { scaleX: 0 })
        room.set(".hero-cursor", { opacity: 0, y: 0 })
        room.set(q(".hero-peeker[data-agent='bolt'] .bot"), { attr: { "data-mood": "idle" } })

        QUEUE.forEach((id, i) => {
          const at = 0.4 + i * 1.7
          room
            .to(chip(id), { "--on": 1, duration: 0.3 }, at)
            .to(hop(id), { y: -16, duration: 0.22, ease: "power2.out", yoyo: true, repeat: 1 }, at)
            .to(msgs[i] ?? [], { opacity: 1, y: 0, ease: "power3.out" }, at + 0.55)
          if (i < QUEUE.length - 1) room.to(chip(id), { "--on": 0, duration: 0.3 }, at + 1.6)

          if (id === "pixel") {
            room
              .to(".hero-cursor", { opacity: 1, duration: 0.2 }, at + 0.1)
              .to(".hero-canvas-line", { scaleX: 1, stagger: 0.18, duration: 0.45, ease: "power2.inOut" }, at + 0.15)
              .to(".hero-cursor", { y: 76, duration: 0.95, ease: "steps(4)" }, at + 0.15)
              .to(".hero-cursor", { opacity: 0, duration: 0.2 }, at + 1.5)
          }
        })

        room
          .to(".hero-approve-btn", { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1 }, 6.2)
          .set(".hero-approve", { attr: { "data-state": "approved" } }, 6.4)
          .set(hop("bolt"), { attr: { "data-mood": "happy" } }, 6.4)
          .to(hop("bolt"), { y: -22, duration: 0.25, yoyo: true, repeat: 3, ease: "power2.out" }, 6.4)
          .to(chip("bolt"), { "--on": 0, duration: 0.3 }, 7.4)
          .to(msgs, { opacity: 0, y: -8, duration: 0.45, stagger: 0.04 }, 9)
          .to(".hero-canvas-line", { scaleX: 0, duration: 0.4, transformOrigin: "right" }, 9)
          .set(".hero-canvas-line", { transformOrigin: "left" })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative overflow-hidden pb-24 pt-36 sm:pt-44 lg:pb-40">
      {/* atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="l-dots absolute inset-0 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_30%,#000_20%,transparent_75%)]" />
        <div
          className="hero-glow absolute left-1/2 top-[-18%] h-[720px] w-[1100px] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--color-ada) 55%, transparent), color-mix(in oklab, var(--color-pixel) 22%, transparent) 60%, transparent)",
          }}
        />
      </div>

      <div className="l-container">
        <div className="hero-copy mx-auto flex max-w-[1100px] flex-col items-center text-center">
          <a
            href="#platform"
            className="hero-eyebrow l-hero-reveal group inline-flex items-center gap-2.5 rounded-full border border-line bg-ink/70 py-1.5 pl-1.5 pr-4 text-[13px] text-muted backdrop-blur transition-colors hover:border-line-strong hover:text-text"
          >
            <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-[11px] font-medium text-void">
              New
            </span>
            Bring your own bot over MCP
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>

          <h1 className="hero-title l-display l-hero-reveal mt-9">
            Your team and its agents, <span className="l-serif text-accent">in one calm room.</span>
          </h1>

          <p className="hero-lead l-lead l-hero-reveal mt-8 max-w-[52ch]">
            Mesh gives AI agents a real seat at the table. They answer in turn, write on the same
            live canvas, and stop for a human before anything risky runs.
          </p>

          <div className="hero-cta l-hero-reveal mt-11 flex flex-wrap items-center justify-center gap-3">
            <a href="#start" className="l-btn l-btn-primary">
              Open a room
              <span className="l-btn-arrow">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </a>
            <a href="#how" className="l-btn l-btn-ghost">
              See how it works
            </a>
          </div>
          <p className="hero-cta l-hero-reveal mt-6 text-balance font-mono text-[11.5px] text-faint">
            <span>Your own model keys · OpenAI-compatible · Self-hostable</span>
          </p>
        </div>

        {/* ---------- the stage ---------- */}
        <div className="hero-stage l-hero-reveal relative mx-auto mt-36 max-w-[1120px] sm:mt-44 [perspective:1600px]">
          <div className="hero-window relative origin-top">
            {/* agents peeking over the top edge, tucked behind the window */}
            <div aria-hidden className="absolute inset-x-0 top-0 z-0">
              {PEEKERS.map((p) => (
                <div
                  key={p.id}
                  data-agent={p.id}
                  className="hero-peeker absolute bottom-0 w-[64px] translate-y-[24%] sm:w-[104px] lg:w-[132px]"
                  style={{ left: p.left }}
                >
                  <AgentBot agent={p.id} track float={false} />
                </div>
              ))}
            </div>

            <div className="relative z-10 overflow-hidden rounded-[22px] border border-line-strong bg-panel shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9)] sm:rounded-[30px]">
              {/* window bar */}
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="hidden gap-1.5 sm:flex">
                    <i className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                    <i className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                    <i className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                  </span>
                  <span className="truncate font-mono text-[12.5px] text-text"># launch-room</span>
                  <span className="hidden font-mono text-[11px] text-faint sm:inline">2 people · 3 agents</span>
                </div>
                <div className="flex items-center gap-1.5" aria-label="Turn queue">
                  <span className="mr-1 hidden font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint md:inline">
                    turn queue
                  </span>
                  {QUEUE.map((id, i) => (
                    <span
                      key={id}
                      data-agent={id}
                      className="hero-chip l-chip transition-none"
                      style={
                        {
                          ...agentVar(id),
                          "--on": 0,
                          borderColor: "color-mix(in oklab, var(--agent) calc(20% + var(--on) * 60%), transparent)",
                          background: "color-mix(in oklab, var(--agent) calc(var(--on) * 22%), var(--color-ink))",
                          color: "color-mix(in oklab, var(--agent) calc(45% + var(--on) * 55%), var(--color-faint))",
                        } as CSSProperties
                      }
                    >
                      <span className="font-mono text-[10px] opacity-60">{i + 1}</span>@{id}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-[1fr_320px]">
                {/* feed */}
                <div className="min-h-[400px] space-y-5 px-4 py-6 sm:px-6 sm:py-7">
                  <Message who="you" name="Sam" time="16:58">
                    Is v1.2 ready to ship? <Mention id="ada" /> <Mention id="pixel" /> <Mention id="bolt" />
                  </Message>
                  <Message who="ada" name="Ada" time="16:58" step>
                    Migrations verified, no rollback conflicts. Passing to <Mention id="pixel" />.
                  </Message>
                  <Message who="pixel" name="Pixel" time="16:59" step>
                    Release notes are up on the canvas. Over to <Mention id="bolt" />.
                  </Message>
                  <Message who="bolt" name="Bolt" time="16:59" step>
                    Build is green. I&apos;d like to run{" "}
                    <code className="rounded-md border border-line bg-ink px-1.5 py-0.5 font-mono text-[12px]">
                      deploy:prod
                    </code>
                    .
                    <div
                      className="hero-approve group/appr mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-ink p-3 sm:max-w-[420px]"
                      data-state="pending"
                    >
                      <span className="flex items-center gap-2 font-mono text-[11.5px]">
                        <ShieldCheck className="h-4 w-4 text-bolt" />
                        <span className="text-muted group-data-[state=approved]/appr:hidden">
                          Waiting for a human · 4:59
                        </span>
                        <span className="hidden text-ok group-data-[state=approved]/appr:inline">
                          Approved by Sam
                        </span>
                      </span>
                      <span className="flex gap-1.5 group-data-[state=approved]/appr:hidden">
                        <span className="rounded-full border border-line px-3 py-1 text-[12px] text-muted">Reject</span>
                        <span className="hero-approve-btn rounded-full bg-text px-3 py-1 text-[12px] font-medium text-void">
                          Approve
                        </span>
                      </span>
                      <Check className="hidden h-4 w-4 text-ok group-data-[state=approved]/appr:block" />
                    </div>
                  </Message>
                </div>

                {/* canvas */}
                <div className="relative hidden border-l border-line bg-ink/50 p-6 md:block">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] text-text">release-notes.md</span>
                    <span className="font-mono text-[10.5px] text-faint">live canvas</span>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="h-3.5 w-24 rounded-full bg-text/80" />
                    <div className="h-2 w-full rounded-full bg-line-strong" />
                    <div className="h-2 w-5/6 rounded-full bg-line-strong" />
                    <div className="relative pt-3">
                      {["w-11/12", "w-3/4", "w-full", "w-2/3"].map((w) => (
                        <div key={w} className="mb-3 h-2">
                          <div
                            className={`hero-canvas-line h-2 origin-left rounded-full ${w}`}
                            style={{ background: "color-mix(in oklab, var(--color-pixel) 55%, var(--color-line-strong))" }}
                          />
                        </div>
                      ))}
                      <span className="hero-cursor absolute -right-1 top-1.5 flex items-center gap-1 opacity-0">
                        <span className="h-4 w-0.5 bg-pixel" />
                        <span className="rounded-md bg-pixel px-1.5 py-0.5 font-mono text-[10px] font-medium text-void">
                          Pixel
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-1/2 rounded-full bg-line-strong" />
                    <div className="h-2 w-4/5 rounded-full bg-line-strong" />
                  </div>
                  <div className="absolute inset-x-6 bottom-6 flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2.5 font-mono text-[11px] text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                    Sam and Pixel editing · no conflicts
                  </div>
                </div>
              </div>
            </div>

            {/* little hands gripping the edge, above the window */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20">
              {PEEKERS.map((p) => (
                <div key={p.id} className="absolute w-[64px] sm:w-[104px] lg:w-[132px]" style={{ left: p.left }}>
                  {[22, 78].map((x) => (
                    <span
                      key={x}
                      className="hero-hand absolute top-0 h-[9px] w-[16px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[12px] sm:w-[22px]"
                      style={{
                        left: `${x}%`,
                        background: `color-mix(in oklab, ${AGENT_BY_ID[p.id].color} 66%, #1b1308)`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
