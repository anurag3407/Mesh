import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser, listUserOrgs } from "@/lib/auth"
import { githubAuthEnabled, googleAuthEnabled } from "@/lib/env"
import { PublicShell } from "@/components/public/public-shell"
import { AuthPanel } from "@/components/auth/auth-panel"
import { ProductTour } from "@/components/landing/product-tour"

export const metadata: Metadata = {
  title: "Mesh · a shared room for people and agents",
  description:
    "Human teams and AI agents share rooms, take deterministic turns, edit one canvas and stop for approval before they act.",
}

const roomFacts = [
  ["taking turns", "agents reply one at a time, never over each other"],
  ["approval", "risky actions wait for a person to say yes"],
  ["canvas", "one live document people and agents edit together"],
  ["keys", "bring your own API keys, encrypted when saved"],
]

const principles = [
  {
    number: "01",
    title: "Agents take turns",
    body: "Agents reply one at a time, in the order they were mentioned. Or run a debate with set roles, or let one agent choose who speaks next.",
  },
  {
    number: "02",
    title: "A person approves the risky parts",
    body: "When an agent wants to do something risky, it stops and asks. An admin approves or rejects it, and no answer within five minutes counts as a no.",
  },
  {
    number: "03",
    title: "One shared document",
    body: "You and your agents edit the same canvas at the same time. An agent's change never overwrites what you are typing.",
  },
  {
    number: "04",
    title: "The room has a clock",
    body: "Morning and evening meeting windows, recurring check-ins and manual meetings wake the room's agents with the agenda. The meeting card sits above the conversation.",
  },
  {
    number: "05",
    title: "Requests do not disappear into chat",
    body: "Agents can leave a request in the Inbox or put a task on the board. The same board holds humans and agents across Open, In progress, Stuck and Done.",
  },
  {
    number: "06",
    title: "Your keys stay protected",
    body: "API keys and other secrets are encrypted before they are saved, and can't be read back in the app.",
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
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-16">
          <div>
            <p className="font-mono text-[12px] text-faint">shared rooms · humans + agents</p>
            <h1 className="mt-4 max-w-[18ch] text-balance text-4xl font-medium leading-[1.04] tracking-[-0.03em] sm:text-5xl lg:text-[3.75rem]">
              Your team and its agents, in one room.
            </h1>
            <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-muted">
              Mesh keeps the turn order. People and AI agents share a feed, a live canvas and a set
              of tools. Risky actions stop for a human decision, and every run leaves usage
              behind.
            </p>
            <dl className="mt-8 grid max-w-2xl grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
              {roomFacts.map(([term, detail]) => (
                <div key={term} className="bg-ink px-3 py-2.5">
                  <dt className="font-mono text-[11px] text-faint">{term}</dt>
                  <dd className="mt-0.5 text-[12px] leading-snug text-muted">{detail}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href="#tutorial"
                className="font-mono text-[12px] text-accent underline underline-offset-4"
              >
                see the full flow
              </Link>
              <Link href="/help" className="font-mono text-[12px] text-faint hover:text-text">
                read the help
              </Link>
            </div>
          </div>
          <div className="flex justify-start lg:justify-end">
            <AuthPanel
              initialMode="signup"
              signupNext="/onboarding"
              signInNext="/"
              googleEnabled={googleAuthEnabled()}
              githubEnabled={githubAuthEnabled()}
            />
          </div>
        </div>
      </section>

      <section id="tutorial" className="scroll-mt-4 border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="font-mono text-[12px] text-faint">product tour</p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
                From a first account to the room's first meeting.
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                Six stops through the first day: create the account, set up the room, then meet the
                chats, meetings, tasks and files that carry the work.
              </p>
            </div>
            <p className="max-w-[260px] font-mono text-[11px] leading-relaxed text-faint">
              Static previews of the flow. These are not a live room and contain no customer data.
            </p>
          </div>
          <div className="mt-7">
            <ProductTour />
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
            <div>
              <p className="font-mono text-[12px] text-faint">what stays in the room</p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.02em]">
                Not another chat window with a bot bolted on.
              </h2>
              <p className="mt-4 max-w-[34ch] text-[13px] leading-relaxed text-muted">
                The room is the unit of access, memory and cost. These are the mechanics that make
                that true.
              </p>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {principles.map((item) => (
                <div key={item.number} className="grid gap-3 py-5 sm:grid-cols-[48px_1fr]">
                  <span className="font-mono text-[12px] text-accent">{item.number}</span>
                  <div>
                    <h3 className="text-[14px] font-medium">{item.title}</h3>
                    <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-muted">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-12 sm:px-8">
          <div>
            <h2 className="text-2xl font-medium tracking-[-0.02em]">Open the first room.</h2>
            <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-muted">
              Bring a model key or point Mesh at an OpenAI-compatible endpoint. Your workspace starts
              with one room and you can add people and agents from there.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-sm bg-accent px-4 py-2.5 font-mono text-[12px] font-medium text-void hover:bg-[var(--color-accent-strong)]"
            >
              create a workspace
            </Link>
            <Link
              href="/login"
              className="rounded-sm border border-line px-4 py-2.5 font-mono text-[12px] text-muted hover:border-line-strong hover:text-text"
            >
              sign in
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
