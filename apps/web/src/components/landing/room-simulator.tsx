"use client"

import React, { useState } from "react"
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  User,
  AlertTriangle,
  Heart,
} from "lucide-react"

interface Message {
  id: string
  sender: "you" | "ada" | "pixel" | "bolt"
  name: string
  avatarColor: string
  text: string
  timestamp: string
  isApproval?: boolean
  approvalStatus?: "pending" | "approved" | "rejected"
  toolCall?: string
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m1",
    sender: "you",
    name: "You",
    avatarColor: "bg-sky-500/20 text-sky-400 border-sky-500/40",
    text: "Hey team! Is the v1.2 release ready to ship? @ada @pixel @bolt",
    timestamp: "16:58",
  },
  {
    id: "m2",
    sender: "ada",
    name: "Ada",
    avatarColor: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    text: "Turn 1/3: Schema migrations and database indices verified. Zero rollback conflicts detected! Passing turn to @pixel 🌸",
    timestamp: "16:58",
  },
]

export function RoomSimulator() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [currentTurn, setCurrentTurn] = useState<"you" | "ada" | "pixel" | "bolt">("pixel")
  const [isTyping, setIsTyping] = useState<string | null>(null)
  const [step, setStep] = useState<number>(1)
  const [approvalHandled, setApprovalHandled] = useState<boolean>(false)

  // Step through sequence
  const advanceSimulation = () => {
    if (step === 1) {
      // Pixel's turn
      setIsTyping("Pixel")
      setTimeout(() => {
        setIsTyping(null)
        setMessages((prev) => [
          ...prev,
          {
            id: "m3",
            sender: "pixel",
            name: "Pixel",
            avatarColor: "bg-purple-500/20 text-purple-400 border-purple-500/40",
            text: "Turn 2/3: Live canvas synchronized! Release notes and SVG illustrations are updated. Handing off to @bolt 🎨",
            timestamp: "16:59",
          },
        ])
        setCurrentTurn("bolt")
        setStep(2)
      }, 1000)
    } else if (step === 2) {
      // Bolt's turn: needs approval
      setIsTyping("Bolt")
      setTimeout(() => {
        setIsTyping(null)
        setMessages((prev) => [
          ...prev,
          {
            id: "m4",
            sender: "bolt",
            name: "Bolt",
            avatarColor: "bg-amber-500/20 text-amber-400 border-amber-500/40",
            text: "Turn 3/3: Production container built and tested. I'm requesting human sign-off before executing the rollout.",
            timestamp: "16:59",
            isApproval: true,
            approvalStatus: "pending",
            toolCall: "pnpm deploy:prod --region us-east",
          },
        ])
        setStep(3)
      }, 1100)
    }
  }

  const handleApprove = (id: string) => {
    setApprovalHandled(true)
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, approvalStatus: "approved" } : m
      )
    )
    // Bolt concludes
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: "m5",
          sender: "bolt",
          name: "Bolt",
          avatarColor: "bg-amber-500/20 text-amber-400 border-amber-500/40",
          text: "🚀 Production deployed successfully! Canary is healthy. Room turn completed without collisions! ✨",
          timestamp: "17:00",
        },
      ])
      setCurrentTurn("you")
      setStep(4)
    }, 800)
  }

  const handleReset = () => {
    setMessages(INITIAL_MESSAGES)
    setCurrentTurn("pixel")
    setStep(1)
    setApprovalHandled(false)
    setIsTyping(null)
  }

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-line bg-panel/90 shadow-2xl backdrop-blur-xl">
      {/* Room Window Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink/90 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {/* Mac-style cute traffic light dots */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 transition-transform hover:scale-125" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 transition-transform hover:scale-125" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 transition-transform hover:scale-125" />
          </div>
          <div className="ml-2 flex items-center gap-2">
            <span className="font-mono text-[13px] font-semibold text-text">
              #launch-room
            </span>
            <span className="flex items-center gap-1 rounded-full border border-ok/30 bg-ok/10 px-2 py-0.5 text-[11px] font-mono text-ok">
              <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" />
              live turn sync
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-[11px] font-mono text-faint sm:flex">
            <Clock className="h-3.5 w-3.5 text-accent" />
            <span>Meeting: 17:00 check-in</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-mono text-muted transition-colors hover:border-line-strong hover:text-text"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Turn Sequence Banner */}
      <div className="border-b border-line bg-raised/50 px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="text-faint">Turn Queue:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span
              className={`rounded-full px-2.5 py-0.5 border ${
                currentTurn === "you"
                  ? "bg-accent text-void border-accent font-semibold"
                  : "bg-panel text-muted border-line"
              }`}
            >
              🧑 You
            </span>
            <ArrowRight className="h-3 w-3 text-faint shrink-0" />
            <span
              className={`rounded-full px-2.5 py-0.5 border ${
                currentTurn === "ada"
                  ? "bg-accent text-void border-accent font-semibold"
                  : "bg-panel text-muted border-line"
              }`}
            >
              🤖 @ada
            </span>
            <ArrowRight className="h-3 w-3 text-faint shrink-0" />
            <span
              className={`rounded-full px-2.5 py-0.5 border ${
                currentTurn === "pixel"
                  ? "bg-purple-500 text-void border-purple-500 font-semibold animate-pulse"
                  : "bg-panel text-muted border-line"
              }`}
            >
              🎨 @pixel
            </span>
            <ArrowRight className="h-3 w-3 text-faint shrink-0" />
            <span
              className={`rounded-full px-2.5 py-0.5 border ${
                currentTurn === "bolt"
                  ? "bg-amber-500 text-void border-amber-500 font-semibold animate-pulse"
                  : "bg-panel text-muted border-line"
              }`}
            >
              ⚡ @bolt
            </span>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="space-y-3.5 p-4 sm:p-6 min-h-[300px]">
        {messages.map((m) => (
          <div key={m.id} className="flex gap-3 items-start">
            {/* Cute Avatar with Mini Capsule Eyes */}
            <div
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${m.avatarColor} font-mono text-[12px] font-semibold shadow-sm`}
            >
              {m.sender === "you" ? (
                <User className="h-4 w-4" />
              ) : (
                <div className="flex items-center gap-0.5">
                  {/* Two tiny capsule eyes */}
                  <span className="h-3 w-1 rounded-full bg-current" />
                  <span className="h-3 w-1 rounded-full bg-current" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-text">
                  {m.name}
                </span>
                <span className="text-[11px] font-mono text-faint">
                  {m.timestamp}
                </span>
                {m.sender !== "you" && (
                  <span className="rounded-full border border-line bg-raised px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider text-faint">
                    bot
                  </span>
                )}
              </div>

              <div className="rounded-2xl rounded-tl-sm border border-line/80 bg-ink/70 px-3.5 py-2.5 text-[13px] leading-relaxed text-text shadow-sm backdrop-blur-sm">
                <p>{m.text}</p>

                {/* Human Approval Card */}
                {m.isApproval && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 text-[12px] font-medium text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Pending Human Consent</span>
                    </div>
                    <div className="mt-1.5 rounded-lg border border-line bg-void/80 p-2 font-mono text-[12px] text-faint">
                      <code>{m.toolCall}</code>
                    </div>

                    {m.approvalStatus === "pending" ? (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(m.id)}
                          className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-void shadow-md transition-transform hover:scale-105 hover:bg-accent-strong"
                        >
                          <Heart className="h-3.5 w-3.5 fill-current" />
                          <span>Approve & Run</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: "rej",
                                sender: "you",
                                name: "You",
                                avatarColor: "bg-sky-500/20 text-sky-400 border-sky-500/40",
                                text: "Let's hold off until tomorrow's standup.",
                                timestamp: "17:00",
                              },
                            ])
                            setStep(4)
                          }}
                          className="rounded-full border border-line px-3 py-1.5 text-[12px] font-mono text-muted hover:border-line-strong hover:text-text"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-ok">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Approved by You · Safe execution authorized</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Live Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-[12px] font-mono text-faint pl-11">
            <span className="italic">{isTyping} is preparing turn...</span>
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
              <span
                className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </span>
          </div>
        )}
      </div>

      {/* Action Footer Simulator Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ink/90 p-4 sm:px-6">
        <div className="flex items-center gap-2">
          {step < 3 ? (
            <button
              type="button"
              onClick={advanceSimulation}
              disabled={isTyping !== null}
              className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[12px] font-semibold text-void shadow-lg shadow-accent/20 transition-all hover:scale-105 hover:bg-accent-strong disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {step === 1 ? "Trigger @pixel's turn 🎨" : "Trigger @bolt's action ⚡"}
              </span>
            </button>
          ) : step === 3 && !approvalHandled ? (
            <span className="text-[12px] font-mono text-amber-400 animate-pulse">
              👈 Click "Approve & Run" above to see safe execution!
            </span>
          ) : (
            <div className="flex items-center gap-2 text-[12px] font-mono text-ok">
              <CheckCircle2 className="h-4 w-4" />
              <span>All turns completed deterministically! 🎉</span>
            </div>
          )}
        </div>

        <p className="font-mono text-[11px] text-faint">
          Deterministic turns · Zero collisions · Human-in-the-loop
        </p>
      </div>
    </div>
  )
}
