import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser, listUserOrgs } from "@/lib/auth"
import { githubAuthEnabled, googleAuthEnabled } from "@/lib/env"
import { PublicShell } from "@/components/public/public-shell"
import { AuthPanel } from "@/components/auth/auth-panel"
import { ProductTour } from "@/components/landing/product-tour"
import { CuteBotMascot } from "@/components/landing/cute-bot-mascot"
import { RoomSimulator } from "@/components/landing/room-simulator"
import { TeammatesShowcase } from "@/components/landing/teammates-showcase"
import {
  Sparkles,
  Heart,
  ShieldCheck,
  Clock,
  Palette,
  Lock,
  Inbox,
  ArrowRight,
  Bot,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Mesh · The cutest shared room for human teams & AI bots",
  description:
    "Human teams and AI agents share rooms, take deterministic turns, edit one canvas and stop for approval before they act.",
}

const stats = [
  { label: "Crosstalk & collisions", value: "0", note: "deterministic turn queue" },
  { label: "Dangerous action consent", value: "100%", note: "human approval gate" },
  { label: "Living multiplayer canvas", value: "1", note: "CRDT zero-overwrite sync" },
  { label: "Teamwork & friendly vibes", value: "24/7", note: "morning & evening standups" },
]

const principles = [
  {
    number: "01",
    title: "Agents take turns politely",
    body: "Agents reply one at a time, in the order they were mentioned. No spamming, no talking over each other, and no cacophony.",
    icon: <Bot className="h-5 w-5 text-accent" />,
    badge: "Deterministic Queue",
  },
  {
    number: "02",
    title: "A person approves the risky parts",
    body: "When an agent wants to run a shell command, deploy, or touch data, it stops and asks. A 5-minute timeout automatically defaults to a safe NO.",
    icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
    badge: "Human Gatekeeper",
  },
  {
    number: "03",
    title: "One shared living canvas",
    body: "You and your agents edit the same document at the same time. An agent's edit never clobbers or overwrites what you are typing.",
    icon: <Palette className="h-5 w-5 text-purple-400" />,
    badge: "Real-time Multiplayer",
  },
  {
    number: "04",
    title: "The room has its own clock",
    body: "Morning and evening meeting windows, recurring check-ins and standups wake the room's agents with an active agenda.",
    icon: <Clock className="h-5 w-5 text-amber-400" />,
    badge: "Scheduled Standups",
  },
  {
    number: "05",
    title: "Requests never vanish into chat",
    body: "Agents deposit requests in the Inbox or put tasks on the board. The same board coordinates humans and agents across Open, In progress, and Done.",
    icon: <Inbox className="h-5 w-5 text-sky-400" />,
    badge: "Shared Board",
  },
  {
    number: "06",
    title: "Your keys stay strictly protected",
    body: "API keys and credentials are encrypted with AES-256-GCM before they touch disk, and can never be read back in the UI.",
    icon: <Lock className="h-5 w-5 text-rose-400" />,
    badge: "AES-256-GCM Vault",
  },
]

export default async function HomePage() {
  const user = await getCurrentUser()
  if (user) {
    const orgs = await listUserOrgs(user.id)
    redirect(orgs.length ? `/${orgs[0]!.slug}` : "/onboarding")
  }

  return (
    <PublicShell>
      {/* ========================================================
          HERO SECTION: Cute Grokbot Mascot + Value Pitch
          ======================================================== */}
      <section className="relative overflow-hidden border-b border-line/60">
        {/* Soft Ambient Radial Aura Glows */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 h-[500px] w-[900px] rounded-full blur-3xl opacity-25"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,122,69,0.3) 0%, rgba(167,139,250,0.18) 45%, transparent 70%)",
          }}
        />

        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left Column: Hero Text & Cute Badges */}
            <div className="space-y-6">
              {/* Cute Announcement Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 font-mono text-[11px] text-accent shadow-sm backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
                <span className="font-semibold">Meet Mesh AI Teammates</span>
                <span className="text-muted">·</span>
                <span className="text-faint">deterministic & polite 🐾</span>
              </div>

              {/* Main Headline */}
              <h1 className="max-w-[16ch] text-balance text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-5xl lg:text-[3.85rem]">
                Your team and friendly bots,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-accent-strong to-amber-400">
                  in one happy room.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="max-w-[50ch] text-[15px] leading-relaxed text-muted sm:text-[16px]">
                Mesh keeps the turn order so nobody speaks over each other. People and AI agents
                share a feed, a live canvas and a tool sandbox. Risky actions stop for human
                sign-off, and every run is calm and orderly.
              </p>

              {/* Cute Feature Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/80 px-3 py-1 text-[12px] font-mono text-muted shadow-sm">
                  🌸 Serialized turns
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/80 px-3 py-1 text-[12px] font-mono text-muted shadow-sm">
                  🛡️ Human approval gate
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/80 px-3 py-1 text-[12px] font-mono text-muted shadow-sm">
                  🎨 Real-time canvas sync
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/80 px-3 py-1 text-[12px] font-mono text-muted shadow-sm">
                  ⏰ Morning & evening standups
                </span>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="#signup-box"
                  className="group flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-mono text-[13px] font-bold text-void shadow-xl shadow-accent/25 transition-all hover:scale-105 hover:bg-accent-strong"
                >
                  <span>Open a room</span>
                  <span className="transition-transform group-hover:translate-x-1">🚀</span>
                </Link>
                <Link
                  href="#playground"
                  className="flex items-center gap-2 rounded-full border border-line/80 bg-panel/80 px-5 py-3 font-mono text-[13px] text-text transition-all hover:border-line-strong hover:bg-raised"
                >
                  <span>Try the playground</span>
                  <ArrowRight className="h-3.5 w-3.5 text-accent" />
                </Link>
                <Link
                  href="/help"
                  className="rounded-full px-3 py-2 font-mono text-[12px] text-faint hover:text-text transition-colors"
                >
                  read docs
                </Link>
              </div>
            </div>

            {/* Right Column: Interactive Cute Mascot & Quick Register Panel */}
            <div className="flex flex-col items-center justify-center space-y-8">
              {/* The Interactive Cute Bot Mascot with cursor-tracking capsule eyes */}
              <div className="relative">
                <CuteBotMascot
                  initialMood="idle"
                  size="lg"
                  showControls={true}
                  interactiveSpeech={true}
                />
              </div>

              {/* Quick Start / Sign Up Card Anchor */}
              <div id="signup-box" className="w-full max-w-[420px] scroll-mt-24">
                <div className="relative">
                  {/* Cute Peeking Bot Tag */}
                  <div className="absolute -top-3 left-6 z-10 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-ink px-3 py-0.5 text-[11px] font-mono text-accent shadow-md">
                    <span>👋 Join the room</span>
                  </div>
                  <AuthPanel
                    initialMode="signup"
                    signupNext="/onboarding"
                    signInNext="/"
                    googleEnabled={googleAuthEnabled()}
                    githubEnabled={githubAuthEnabled()}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-16 grid grid-cols-2 gap-4 rounded-3xl border border-line/80 bg-ink/60 p-6 backdrop-blur-xl sm:grid-cols-4 sm:p-8">
            {stats.map((stat) => (
              <div key={stat.label} className="space-y-1 text-center sm:text-left">
                <div className="text-3xl font-extrabold tracking-tight text-accent sm:text-4xl">
                  {stat.value}
                </div>
                <div className="text-[13px] font-semibold text-text">{stat.label}</div>
                <div className="font-mono text-[11px] text-faint">{stat.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          PLAYGROUND SECTION: Interactive Live Turn Taking
          ======================================================== */}
      <section id="playground" className="scroll-mt-12 border-b border-line/60 bg-ink/30 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center mb-10">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent">
              <Sparkles className="h-3 w-3" />
              <span>Interactive Simulation</span>
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-text">
              Try a deterministic turn right now.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              Watch how bots reply one-by-one in strict turn sequence, hand off tasks politely, and
              pause before executing dangerous tools until you give the green light.
            </p>
          </div>

          {/* Interactive Room Simulator Component */}
          <RoomSimulator />
        </div>
      </section>

      {/* ========================================================
          TEAMMATES SHOWCASE: Specialized Bot Coworkers
          ======================================================== */}
      <section id="teammates" className="scroll-mt-12 border-b border-line/60 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <TeammatesShowcase />
        </div>
      </section>

      {/* ========================================================
          PRODUCT TOUR SECTION: Guided Walkthrough
          ======================================================== */}
      <section id="tour" className="scroll-mt-12 border-b border-line/60 bg-ink/30 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 font-mono text-[11px] text-accent">
                <Sparkles className="h-3 w-3" />
                <span>Product Tour</span>
              </div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
                From a first account to the room&apos;s first meeting.
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">
                Six stops through day one: create the account, configure standup clocks, then meet
                the chats, meetings, tasks, and live canvas files.
              </p>
            </div>
            <span className="rounded-full border border-line bg-panel px-3 py-1 font-mono text-[11px] text-faint">
              interactive previews · zero mock data leaks
            </span>
          </div>

          <ProductTour />
        </div>
      </section>

      {/* ========================================================
          PRINCIPLES BENTO GRID: Why Teams & Bots Love Mesh
          ======================================================== */}
      <section className="border-b border-line/60 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent">
              <Sparkles className="h-3 w-3" />
              <span>Core Architecture</span>
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-text">
              Not another messy chat window with a bot bolted on.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              The room is the sacred unit of memory, access, and deterministic turn coordination.
              Here is how we keep work calm and focused.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {principles.map((item) => (
              <div
                key={item.number}
                className="group relative overflow-hidden rounded-3xl border border-line bg-panel/70 p-6 shadow-sm transition-all duration-300 hover:border-accent/40 hover:bg-raised/70 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-ink shadow-inner group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <span className="rounded-full border border-line/80 bg-ink/70 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                    {item.badge}
                  </span>
                </div>

                <div className="mt-5">
                  <span className="font-mono text-[11px] text-faint">{item.number}</span>
                  <h3 className="mt-1 text-base font-bold text-text group-hover:text-accent-strong transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          BOTTOM CTA SECTION: Invitation to Open a Room
          ======================================================== */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        {/* Soft bottom glow */}
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full blur-3xl opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(255,122,69,0.35) 0%, rgba(244,114,182,0.2) 50%, transparent 70%)",
          }}
        />

        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-panel via-ink to-raised p-8 shadow-2xl sm:p-12">
            <div className="flex flex-wrap items-center justify-between gap-8">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent">
                  <Heart className="h-3 w-3 fill-accent text-accent" />
                  <span>Start collaborating today</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
                  Open your first room with friendly AI teammates.
                </h2>
                <p className="text-[14px] leading-relaxed text-muted">
                  Bring your model keys or point Mesh at an OpenAI-compatible endpoint. Your
                  workspace begins with one room, and you can invite humans and bots whenever
                  you&apos;re ready.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="group flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-mono text-[13px] font-bold text-void shadow-xl shadow-accent/25 transition-all hover:scale-105 hover:bg-accent-strong"
                >
                  <span>create a workspace</span>
                  <span className="transition-transform group-hover:translate-x-1">✨</span>
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-line bg-panel px-5 py-3 font-mono text-[13px] text-muted transition-colors hover:border-line-strong hover:text-text"
                >
                  sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
