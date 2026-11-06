"use client"

import React, { useState } from "react"
import { Sparkles, Bot, Palette, Terminal, Calendar, Heart } from "lucide-react"

interface Teammate {
  id: string
  name: string
  handle: string
  role: string
  color: string
  borderColor: string
  eyeColor: string
  quote: string
  traits: string[]
  icon: React.ReactNode
}

const TEAMMATES: Teammate[] = [
  {
    id: "ada",
    name: "Ada",
    handle: "@ada",
    role: "Turn Coordinator & Architect",
    color: "from-orange-500/20 to-amber-500/10",
    borderColor: "hover:border-orange-500/50",
    eyeColor: "#ff7a45",
    quote: "I make sure everyone speaks in orderly, deterministic turns. No chatter collisions, ever! 🌸",
    traits: ["Turn serialization", "Agent-to-agent handoffs", "Context memory"],
    icon: <Bot className="h-4 w-4 text-orange-400" />,
  },
  {
    id: "pixel",
    name: "Pixel",
    handle: "@pixel",
    role: "Living Canvas Co-Author",
    color: "from-purple-500/20 to-pink-500/10",
    borderColor: "hover:border-purple-500/50",
    eyeColor: "#c084fc",
    quote: "We edit the same canvas live! You type on line 1, I draw diagrams on line 20 without conflicts. 🎨",
    traits: ["Hocuspocus CRDT sync", "Markdown & SVGs", "Zero overwrite guarantee"],
    icon: <Palette className="h-4 w-4 text-purple-400" />,
  },
  {
    id: "bolt",
    name: "Bolt",
    handle: "@bolt",
    role: "Sandbox Tool Specialist",
    color: "from-amber-500/20 to-yellow-500/10",
    borderColor: "hover:border-amber-500/50",
    eyeColor: "#fbbf24",
    quote: "I run sandboxed code, web scrapers, and deployments — but I will always stop and ask for your approval! ⚡",
    traits: ["Human-in-the-loop gate", "5-minute veto timeout", "BYO API keys"],
    icon: <Terminal className="h-4 w-4 text-amber-400" />,
  },
  {
    id: "sage",
    name: "Sage",
    handle: "@sage",
    role: "Meeting & Standup Host",
    color: "from-emerald-500/20 to-teal-500/10",
    borderColor: "hover:border-emerald-500/50",
    eyeColor: "#34d399",
    quote: "Morning at 9:00 AM, evening at 5:00 PM — I wake the room with agendas and track every task to completion. 🌿",
    traits: ["Automated check-ins", "Task board triage", "Shared inbox tracking"],
    icon: <Calendar className="h-4 w-4 text-emerald-400" />,
  },
]

export function TeammatesShowcase() {
  const [selectedBot, setSelectedBot] = useState<string>("ada")

  return (
    <div className="w-full">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent">
          <Sparkles className="h-3 w-3" />
          <span>Meet Your AI Teammates</span>
        </div>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-text">
          Not random chatbots. Dedicated teammates.
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          Each bot has a distinct role, memory, and personality in the room. They respect your time,
          take turns politely, and stop for your approval.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TEAMMATES.map((bot) => {
          const isSelected = selectedBot === bot.id
          return (
            <div
              key={bot.id}
              onClick={() => setSelectedBot(bot.id)}
              className={`group relative cursor-pointer overflow-hidden rounded-3xl border transition-all duration-300 p-6 ${
                isSelected
                  ? "border-accent bg-gradient-to-b " + bot.color + " shadow-xl shadow-accent/10 -translate-y-1"
                  : "border-line bg-panel/70 hover:border-line-strong hover:bg-raised/70 hover:-translate-y-0.5"
              } ${bot.borderColor}`}
            >
              {/* Cute Bot Avatar with Capsule Eyes */}
              <div className="flex items-center justify-between">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-ink shadow-inner group-hover:scale-105 transition-transform">
                  {/* Mini bot face SVG with capsule eyes */}
                  <svg viewBox="0 0 48 48" className="h-10 w-10">
                    <rect x="6" y="8" width="36" height="32" rx="10" fill="#151b17" stroke="#354037" strokeWidth="1.5" />
                    {/* Dark Visor */}
                    <rect x="10" y="14" width="28" height="20" rx="6" fill="#070907" />
                    {/* Left Capsule Eye */}
                    <rect
                      x="16"
                      y="18"
                      width="4.5"
                      height="11"
                      rx="2.25"
                      fill={bot.eyeColor}
                      className="group-hover:animate-pulse"
                    />
                    {/* Right Capsule Eye */}
                    <rect
                      x="27.5"
                      y="18"
                      width="4.5"
                      height="11"
                      rx="2.25"
                      fill={bot.eyeColor}
                      className="group-hover:animate-pulse"
                    />
                    {/* Antenna */}
                    <circle cx="24" cy="5" r="2.5" fill={bot.eyeColor} />
                    <line x1="24" y1="5" x2="24" y2="8" stroke="#354037" strokeWidth="1.5" />
                  </svg>
                </div>

                <div className="rounded-full border border-line bg-ink/70 px-2.5 py-1 text-[11px] font-mono text-muted">
                  {bot.handle}
                </div>
              </div>

              {/* Bot Info */}
              <div className="mt-5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-bold text-text">{bot.name}</h3>
                  {bot.icon}
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-faint">{bot.role}</p>

                {/* Quote Bubble */}
                <div className="mt-4 rounded-2xl border border-line/60 bg-ink/60 p-3 text-[12px] leading-relaxed text-muted backdrop-blur-sm">
                  &ldquo;{bot.quote}&rdquo;
                </div>

                {/* Trait Pills */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {bot.traits.map((trait) => (
                    <span
                      key={trait}
                      className="rounded-full border border-line/80 bg-ink/40 px-2 py-0.5 text-[10px] font-mono text-faint"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom selection indicator */}
              {isSelected && (
                <div className="mt-5 flex items-center gap-1.5 text-[11px] font-mono text-accent">
                  <Heart className="h-3 w-3 fill-current" />
                  <span>Active in your workspace</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
