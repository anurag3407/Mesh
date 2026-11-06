"use client"

import { useRef } from "react"
import { Check, ShieldAlert } from "lucide-react"
import { AgentBot } from "./agent-bot"
import { AGENT_BY_ID, type AgentId } from "./agents"
import { gsap, MOTION_DESKTOP, MOTION_MOBILE, ScrollTrigger, useGSAP } from "./gsap"

const STEPS = [
  {
    key: "Turns",
    title: "Agents speak one at a time",
    body: "Mention three agents and they answer in the order you named them, each one reading what the last one said. No crosstalk, no pile-ups.",
  },
  {
    key: "Approvals",
    title: "Risky tools wait for a person",
    body: "Shell commands, deploys, data writes: anything marked dangerous pauses for a room admin. Five minutes of silence counts as a no.",
  },
  {
    key: "Canvas",
    title: "Everyone writes on one canvas",
    body: "Markdown, code, SVG or HTML, edited live by people and agents at once. An agent's edit never clobbers what you're typing.",
  },
  {
    key: "Clock",
    title: "The room keeps its own clock",
    body: "Two weekday meetings and optional check-ins wake the agents with an agenda. Requests land in the Inbox and work lands on the board.",
  },
]

const tint = (id: AgentId, pct = 14) => `color-mix(in oklab, ${AGENT_BY_ID[id].color} ${pct}%, var(--color-ink))`

/* ================================================================== */
/* Scenes. Each is plain markup plus a timeline builder scoped to it. */
/* ================================================================== */

const TURN_ORDER: { id: AgentId; line: string }[] = [
  { id: "ada", line: "Scope looks good." },
  { id: "pixel", line: "Plan's on the canvas." },
  { id: "bolt", line: "Tests are green." },
]

function SceneTurns() {
  return (
    <div className="flex w-full max-w-[540px] flex-col gap-8 sm:gap-10">
      <div className="s1-ask self-end rounded-[20px] rounded-br-md bg-cream px-4 py-3 text-[14px] text-cream-ink sm:text-[15px]">
        Can we ship Friday?{" "}
        {TURN_ORDER.map((t) => (
          <b key={t.id} className="font-medium">
            @{t.id}{" "}
          </b>
        ))}
      </div>
      <div className="relative grid grid-cols-3 gap-3">
        <div
          className="s1-spot absolute bottom-[6%] left-0 h-[58%] w-[calc((100%-24px)/3)] opacity-0"
          style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--color-text) 15%, transparent), transparent)" }}
        />
        {TURN_ORDER.map((t, i) => (
          <div key={t.id} className="relative flex flex-col items-center">
            <div
              className="s1-bubble relative mb-3 w-full rounded-2xl border px-3 py-2.5 text-center text-[12.5px] leading-snug opacity-0 sm:text-[13.5px]"
              style={{ borderColor: `color-mix(in oklab, ${AGENT_BY_ID[t.id].color} 35%, transparent)`, background: tint(t.id) }}
            >
              {t.line}
            </div>
            <div className="s1-bot w-[72%] max-w-[120px]">
              <AgentBot agent={t.id} track />
            </div>
            <span
              className="s1-num mt-3 grid h-7 w-7 place-items-center rounded-full border border-line font-mono text-[11px] text-faint"
              style={{ ["--agent" as string]: AGENT_BY_ID[t.id].color }}
            >
              {i + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildTurns(el: Element) {
  const q = gsap.utils.selector(el)
  const tl = gsap.timeline({ defaults: { duration: 0.35 } })
  tl.from(q(".s1-ask"), { y: 20, opacity: 0 })
  q(".s1-bot").forEach((bot, i) => {
    const column = bot.parentElement as HTMLElement
    tl.to(q(".s1-spot"), { opacity: 1, x: () => column.offsetLeft, duration: i ? 0.35 : 0.01 })
      .to(bot, { y: -14, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.out" }, "<")
      .to(q(".s1-num")[i] ?? [], { color: "var(--color-void)", backgroundColor: "var(--agent)", borderColor: "var(--agent)" }, "<")
      .to(q(".s1-bubble")[i] ?? [], { opacity: 1, y: 0, startAt: { y: 12 } }, "<0.1")
      .to({}, { duration: 0.25 })
  })
  return tl
}

function SceneApproval() {
  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-4">
      <div className="s2-bot w-[34%] min-w-[110px] max-w-[170px] flex-none">
        <AgentBot agent="bolt" track />
      </div>
      <div className="s2-card w-full rounded-[24px] border border-line-strong bg-ink p-5 shadow-[0_30px_60px_-30px_#000] sm:p-6">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.12em] text-bolt">
            <ShieldAlert className="h-4 w-4" /> Needs approval
          </span>
          <div className="relative h-11 w-11">
            <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
              <circle cx="22" cy="22" r="19" fill="none" stroke="var(--color-line)" strokeWidth="3" />
              <circle
                className="s2-ring"
                cx="22"
                cy="22"
                r="19"
                fill="none"
                stroke="var(--color-bolt)"
                strokeWidth="3"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset="0"
              />
            </svg>
            <span className="s2-time absolute inset-0 grid place-items-center font-mono text-[10px] text-muted">5:00</span>
          </div>
        </div>
        <p className="mt-4 text-[15px] text-text">Bolt wants to run</p>
        <code className="mt-2 block rounded-xl border border-line bg-panel px-3 py-2.5 font-mono text-[12.5px] text-text">
          deploy:prod --region eu-west
        </code>
        <div className="relative mt-5 flex gap-2">
          <span className="flex-1 rounded-full border border-line py-2.5 text-center text-[13px] text-muted">Reject</span>
          <span className="s2-approve flex-1 rounded-full bg-text py-2.5 text-center text-[13px] font-medium text-void">
            Approve
          </span>
          <span className="s2-stamp absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-ok text-[13px] font-medium text-void opacity-0">
            <Check className="h-4 w-4" /> Approved by Sam
          </span>
        </div>
      </div>
    </div>
  )
}

function buildApproval(el: Element) {
  const q = gsap.utils.selector(el)
  const clock = { s: 300 }
  const time = q(".s2-time")[0]
  const tl = gsap.timeline({ defaults: { duration: 0.35 } })
  tl.from(q(".s2-card"), { y: 40, rotate: 3, opacity: 0 })
    .from(q(".s2-bot"), { x: -30, opacity: 0 }, "<")
    .to(q(".s2-ring"), { strokeDashoffset: 22, duration: 1, ease: "none" })
    .to(
      clock,
      {
        s: 234,
        duration: 1,
        ease: "none",
        onUpdate: () => {
          if (!time) return
          const s = Math.round(clock.s)
          time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
        },
      },
      "<",
    )
    .to(q(".s2-approve"), { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 })
    .to(q(".s2-stamp"), { opacity: 1, scale: 1, startAt: { scale: 0.8 }, ease: "back.out(2)" })
    .set(q(".s2-bot .bot"), { attr: { "data-mood": "happy" } }, "<")
    .to(q(".s2-bot"), { y: -16, duration: 0.15, yoyo: true, repeat: 3, ease: "power2.out" }, "<")
  return tl
}

const CANVAS_A = ["w-[78%]", "w-[92%]", "w-[60%]"]
const CANVAS_B = ["w-[86%]", "w-[70%]", "w-[94%]", "w-[52%]"]

function SceneCanvas() {
  return (
    <div className="relative w-full max-w-[540px]">
      <div className="absolute -right-3 -top-14 w-20 sm:-right-6 sm:w-24" aria-hidden>
        <AgentBot agent="pixel" track float />
      </div>
      <div className="relative overflow-hidden rounded-[24px] border border-line-strong bg-ink shadow-[0_30px_60px_-30px_#000]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <span className="font-mono text-[12.5px]">launch-plan.md</span>
          <span className="flex -space-x-1.5">
            <span className="h-5 w-5 rounded-full border-2 border-ink bg-cream" />
            <span className="h-5 w-5 rounded-full border-2 border-ink bg-pixel" />
          </span>
        </div>
        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <div className="mb-4 h-3.5 w-28 rounded-full bg-text/85" />
            <div className="relative space-y-2.5">
              {CANVAS_A.map((w) => (
                <div key={w} className={`s3-a h-2 origin-left rounded-full bg-cream/70 ${w}`} />
              ))}
              <span className="s3-cur-a absolute -top-1 left-0 flex items-start gap-1">
                <span className="h-4 w-0.5 bg-cream" />
                <span className="rounded-md bg-cream px-1.5 py-0.5 font-mono text-[10px] font-medium text-cream-ink">Sam</span>
              </span>
            </div>
          </div>
          <div>
            <div className="mb-4 h-3.5 w-36 rounded-full bg-text/85" />
            <div className="relative space-y-2.5">
              {CANVAS_B.map((w) => (
                <div key={w} className={`s3-b h-2 origin-left rounded-full ${w}`} style={{ background: "color-mix(in oklab, var(--color-pixel) 70%, var(--color-line))" }} />
              ))}
              <span className="s3-cur-b absolute -top-1 left-0 flex items-start gap-1">
                <span className="h-4 w-0.5 bg-pixel" />
                <span className="rounded-md bg-pixel px-1.5 py-0.5 font-mono text-[10px] font-medium text-void">Pixel</span>
              </span>
            </div>
          </div>
        </div>
        <div className="s3-badge mx-5 mb-5 flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2.5 font-mono text-[11.5px] text-muted sm:mx-6 sm:mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Synced · 0 overwrites
        </div>
      </div>
    </div>
  )
}

function buildCanvas(el: Element) {
  const q = gsap.utils.selector(el)
  const tl = gsap.timeline({ defaults: { ease: "none" } })
  const type = (lines: Element[], cursor: Element | undefined, at: number) => {
    lines.forEach((line, i) => {
      const t = at + i * 0.32
      const w = (line as HTMLElement).offsetWidth || 200
      tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.3 }, t)
      if (cursor) tl.fromTo(cursor, { x: 0, y: i * 18 }, { x: w, y: i * 18, duration: 0.3, immediateRender: false }, t)
    })
  }
  type(q(".s3-a"), q(".s3-cur-a")[0], 0)
  type(q(".s3-b"), q(".s3-cur-b")[0], 0.1)
  tl.from(q(".s3-badge"), { y: 14, opacity: 0, duration: 0.3, ease: "back.out(2)" })
  return tl
}

const TASKS: { label: string; owner: AgentId | "you" }[] = [
  { label: "Write release notes", owner: "pixel" },
  { label: "Approve the deploy window", owner: "you" },
  { label: "Run the smoke tests", owner: "bolt" },
]

function SceneClock() {
  return (
    <div className="grid w-full max-w-[560px] items-center gap-6 sm:grid-cols-[180px_1fr]">
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg viewBox="0 0 120 120" className="h-28 w-28 sm:h-36 sm:w-36" aria-hidden>
            <circle cx="60" cy="60" r="56" fill="var(--color-ink)" stroke="var(--color-line-strong)" strokeWidth="2" />
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={i}
                x1="60"
                y1="10"
                x2="60"
                y2={i % 3 ? "15" : "19"}
                stroke="var(--color-faint)"
                strokeWidth="2"
                strokeLinecap="round"
                transform={`rotate(${i * 30} 60 60)`}
              />
            ))}
            <line x1="60" y1="60" x2="60" y2="30" stroke="var(--color-text)" strokeWidth="4" strokeLinecap="round" className="s4-hour" style={{ transformOrigin: "60px 60px" }} />
            <line x1="60" y1="60" x2="60" y2="20" stroke="var(--color-sage)" strokeWidth="2.5" strokeLinecap="round" className="s4-min" style={{ transformOrigin: "60px 60px" }} />
            <circle cx="60" cy="60" r="4" fill="var(--color-sage)" />
          </svg>
          <div className="s4-sage absolute -bottom-6 -right-10 w-20 sm:w-24">
            <AgentBot agent="sage" mood="sleep" track />
          </div>
        </div>
        <span className="s4-label mt-8 font-mono text-[12px] text-faint">08:58</span>
      </div>
      <div className="rounded-[24px] border border-line-strong bg-ink p-5 shadow-[0_30px_60px_-30px_#000]">
        <div className="s4-agenda flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.12em] text-sage">
          <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Morning standup · agenda
        </div>
        <ul className="mt-4 space-y-2">
          {TASKS.map((t) => (
            <li key={t.label} className="s4-task flex items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2.5">
              <span className="s4-check grid h-5 w-5 flex-none place-items-center rounded-md border border-line-strong">
                <Check className="s4-tick h-3.5 w-3.5 text-ok opacity-0" />
              </span>
              <span className="flex-1 text-[13.5px] text-text">{t.label}</span>
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: t.owner === "you" ? "var(--color-cream)" : AGENT_BY_ID[t.owner].color }}
                title={t.owner}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function buildClock(el: Element) {
  const q = gsap.utils.selector(el)
  const label = q(".s4-label")[0]
  const clock = { m: 538 }
  const tl = gsap.timeline({ defaults: { duration: 0.35 } })
  tl.fromTo(q(".s4-hour"), { rotate: 266 }, { rotate: 270, duration: 0.6, ease: "none" })
    .fromTo(q(".s4-min"), { rotate: 348 }, { rotate: 360, duration: 0.6, ease: "none" }, "<")
    .to(
      clock,
      {
        m: 540,
        duration: 0.6,
        ease: "none",
        onUpdate: () => {
          if (!label) return
          const m = Math.round(clock.m)
          label.textContent = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
        },
      },
      "<",
    )
    .set(q(".s4-sage .bot"), { attr: { "data-mood": "happy" } })
    .to(q(".s4-sage"), { y: -18, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.out" }, "<")
    .from(q(".s4-agenda"), { opacity: 0, x: -10 })
    .from(q(".s4-task"), { opacity: 0, y: 16, stagger: 0.12 }, "<")
  q(".s4-task").forEach((task) => {
    tl.to(task.querySelector(".s4-tick"), { opacity: 1, scale: 1, startAt: { scale: 0.4 }, duration: 0.2, ease: "back.out(3)" })
      .to(task.querySelector(".s4-check"), { borderColor: "var(--color-ok)", duration: 0.2 }, "<")
  })
  return tl
}

const SCENES = [
  { Scene: SceneTurns, build: buildTurns },
  { Scene: SceneApproval, build: buildApproval },
  { Scene: SceneCanvas, build: buildCanvas },
  { Scene: SceneClock, build: buildClock },
]

/* ================================================================== */

function Heading() {
  return (
    <>
      <span className="l-eyebrow">03 — How a room works</span>
      <h2 className="l-h2 mt-7" style={{ fontSize: "clamp(2.5rem, 4.6vw, 4.5rem)" }}>
        Four rules that keep agents <span className="l-serif">polite.</span>
      </h2>
    </>
  )
}

export function HowItWorks() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      const q = gsap.utils.selector(root)

      mm.add(MOTION_DESKTOP, () => {
        const scenes = q(".hiw-desktop .hiw-scene")
        const steps = q(".hiw-step")
        let marks: number[] = [0]
        gsap.set(scenes.slice(1), { autoAlpha: 0 })

        const master = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: q(".hiw-desktop")[0],
            pin: true,
            start: "top top",
            end: () => `+=${window.innerHeight * 4.2}`,
            scrub: 0.7,
            invalidateOnRefresh: true,
            onUpdate(self) {
              let active = 0
              marks.forEach((mark, i) => self.progress >= mark && (active = i))
              steps.forEach((s, i) => s.toggleAttribute("data-active", i === active))
            },
          },
        })
        master.fromTo(q(".hiw-progress"), { scaleY: 0 }, { scaleY: 1, ease: "none", duration: 1 }, 0)

        const segments = gsap.timeline()
        scenes.forEach((scene, i) => {
          if (i > 0) {
            segments
              .addLabel(`step${i}`, "+=0.3")
              .to(scenes[i - 1]!, { autoAlpha: 0, y: -50, scale: 0.96, duration: 0.5 }, `step${i}-=0.3`)
              .fromTo(scene, { autoAlpha: 0, y: 50, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5 }, "<0.15")
          }
          segments.add(SCENES[i]!.build(scene)).to({}, { duration: 0.6 })
        })
        // Where each step takes over, as a fraction of the pinned scroll.
        const total = segments.duration()
        marks = STEPS.map((_, i) => (i === 0 ? 0 : (segments.labels[`step${i}`] ?? 0) / total))
        master.add(segments.duration(1), 0)
      })

      // No motion: every scene simply shows its finished state.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        q(".hiw-mobile .hiw-scene").forEach((scene, i) => void SCENES[i]!.build(scene).progress(1).pause())
      })

      mm.add(MOTION_MOBILE, () => {
        q(".hiw-mobile .hiw-scene").forEach((scene, i) => {
          const tl = SCENES[i]!.build(scene)
          tl.pause(0)
          ScrollTrigger.create({ trigger: scene, start: "top 70%", once: true, onEnter: () => void tl.play() })
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="how" className="relative">
      {/* desktop: pinned story */}
      <div className="hiw-desktop hidden h-screen items-center motion-safe:lg:flex">
        <div className="l-container grid grid-cols-[0.82fr_1.18fr] items-center gap-16 xl:gap-24">
          <div>
            <Heading />
            <ol className="relative mt-14 space-y-1 pl-8">
              <span aria-hidden className="absolute bottom-2 left-0 top-2 w-px bg-line" />
              <span aria-hidden className="hiw-progress absolute bottom-2 left-0 top-2 w-px origin-top bg-accent" />
              {STEPS.map((step, i) => (
                <li key={step.key} className="hiw-step group py-3" data-active={i === 0 ? "" : undefined}>
                  <div className="flex items-baseline gap-4 text-faint transition-colors duration-500 group-data-[active]:text-text">
                    <span className="font-mono text-[12px]">0{i + 1}</span>
                    <span className="text-[clamp(1.25rem,1.7vw,1.6rem)] font-medium tracking-[-0.02em]">{step.title}</span>
                  </div>
                  <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-out group-data-[active]:grid-rows-[1fr]">
                    <p className="overflow-hidden pl-9 text-[15.5px] leading-relaxed text-muted">
                      <span className="block pt-3">{step.body}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="l-card l-dots relative aspect-[5/4] max-h-[78vh] w-full overflow-hidden">
            {SCENES.map(({ Scene }, i) => (
              <div key={i} className="hiw-scene absolute inset-0 grid place-items-center p-10 xl:p-14">
                <Scene />
              </div>
            ))}
            <span className="absolute bottom-6 left-7 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
              # launch-room
            </span>
          </div>
        </div>
      </div>

      {/* mobile & tablet: stacked */}
      <div className="hiw-mobile l-section l-container motion-safe:lg:hidden">
        <Heading />
        <ol className="mt-16 space-y-20">
          {STEPS.map((step, i) => {
            const { Scene } = SCENES[i]!
            return (
              <li key={step.key}>
                <span className="font-mono text-[12px] text-accent">0{i + 1} · {step.key}</span>
                <h3 className="l-h3 mt-3">{step.title}</h3>
                <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-muted">{step.body}</p>
                <div className="hiw-scene l-card l-dots mt-8 grid place-items-center px-5 pb-10 pt-16 sm:px-10">
                  <Scene />
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
