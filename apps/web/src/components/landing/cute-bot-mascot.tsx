"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Heart, Bot, Smile, Brain, Hand } from "lucide-react"

export type MascotMood = "idle" | "happy" | "thinking" | "love" | "waving"

interface CuteBotMascotProps {
  initialMood?: MascotMood
  showControls?: boolean
  size?: "sm" | "md" | "lg"
  interactiveSpeech?: boolean
  className?: string
}

const MOOD_LINES: Record<MascotMood, string[]> = {
  idle: [
    "Beep boop! Ready to share a room with you ✨",
    "I'll always wait for my turn politely 🍵",
    "Humans + bots collaborating in harmony! 🌸",
    "I follow your cursor! Move your mouse around 👀",
    "Tap me or pick a mood below 🎀",
  ],
  happy: [
    "Yay! No more talking over each other! 💖",
    "Room sync is 100% peaceful today! ✨",
    "Best teammates ever! Beep! 🎉",
    "Everything is running smoothly! 🌸",
  ],
  thinking: [
    "Hmm... reviewing the turn queue... 💭",
    "Synthesizing ideas on the shared canvas... 🎨",
    "Planning our morning standup agenda... ☕",
    "Deterministic execution in progress... 🧠",
  ],
  love: [
    "I love polite human-in-the-loop approvals! ❤️",
    "Humans and agents are the dream team 🌟",
    "100% consent, 0% chaos! 💕",
    "Sending good vibes to the room! ✨",
  ],
  waving: [
    "Hello there! Welcome to Mesh! 👋",
    "Step into the room, your seat is saved! 🎈",
    "Glad you're here! Let's build something cute 🚀",
    "Waving hello from the orchestrator! 🐾",
  ],
}

export function CuteBotMascot({
  initialMood = "idle",
  showControls = true,
  size = "lg",
  interactiveSpeech = true,
  className = "",
}: CuteBotMascotProps) {
  const [mood, setMood] = useState<MascotMood>(initialMood)
  const [isBlinking, setIsBlinking] = useState(false)
  const [speechIndex, setSpeechIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Track cursor position and translate into clamped eye offset
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx = e.clientX - centerX
      const dy = e.clientY - centerY

      // Distance factor
      const maxDistance = 350
      const distance = Math.sqrt(dx * dx + dy * dy)
      const clampedDist = Math.min(distance, maxDistance)
      const factor = clampedDist / maxDistance

      // Max eye travel inside visor: +/- 9px horizontally, +/- 6px vertically
      const angle = Math.atan2(dy, dx)
      const targetX = Math.cos(angle) * factor * 9
      const targetY = Math.sin(angle) * factor * 6

      setEyeOffset({ x: targetX, y: targetY })
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // Natural blinking interval
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    function scheduleBlink() {
      // Blink every 3 to 6 seconds
      const delay = 3000 + Math.random() * 3000
      timeoutId = setTimeout(() => {
        setIsBlinking(true)
        setTimeout(() => {
          setIsBlinking(false)
          scheduleBlink()
        }, 160)
      }, delay)
    }

    scheduleBlink()
    return () => clearTimeout(timeoutId)
  }, [])

  // Cycle speech bubbles on click
  const handleBotClick = useCallback(() => {
    const moods: MascotMood[] = ["idle", "happy", "thinking", "love", "waving"]
    const nextMood = moods[(moods.indexOf(mood) + 1) % moods.length]!
    setMood(nextMood)
    setSpeechIndex((prev) => prev + 1)
  }, [mood])

  const currentLines = MOOD_LINES[mood]
  const currentLine = currentLines[speechIndex % currentLines.length]

  const sizeClasses = {
    sm: "w-44 h-44",
    md: "w-56 h-56",
    lg: "w-64 h-64 sm:w-72 sm:h-72",
  }[size]

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center select-none ${className}`}
    >
      {/* Interactive Speech Bubble */}
      {interactiveSpeech && (
        <div className="relative mb-3 max-w-[280px] sm:max-w-[320px] transition-all duration-300 transform -translate-y-1">
          <div
            onClick={handleBotClick}
            className="group cursor-pointer rounded-2xl border border-accent/30 bg-ink/90 px-4 py-2.5 text-center shadow-lg shadow-accent/10 backdrop-blur-md transition-all hover:scale-[1.02] hover:border-accent/60"
          >
            <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
              <span>Mesh Bot · {mood}</span>
            </div>
            <p className="mt-1 text-[13px] font-medium leading-snug text-text transition-colors group-hover:text-accent-strong">
              {currentLine}
            </p>
          </div>
          {/* Bubble tail */}
          <div className="mx-auto -mt-px h-2.5 w-4 overflow-hidden">
            <div className="h-4 w-4 origin-top-left rotate-45 border-b border-r border-accent/30 bg-ink/90" />
          </div>
        </div>
      )}

      {/* Mascot Container & Animations */}
      <div
        className={`relative ${sizeClasses} cursor-pointer group`}
        onClick={handleBotClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        aria-label={`Interactive mascot bot, current mood: ${mood}. Click to cycle moods.`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleBotClick()
          }
        }}
      >
        {/* Soft Ambient Radial Aura Glow */}
        <div
          className="absolute inset-0 -inset-x-6 -inset-y-6 rounded-full blur-2xl opacity-40 transition-all duration-700 pointer-events-none"
          style={{
            background:
              mood === "love"
                ? "radial-gradient(circle, rgba(244,114,182,0.35) 0%, rgba(255,122,69,0.15) 50%, transparent 70%)"
                : mood === "happy"
                ? "radial-gradient(circle, rgba(255,180,69,0.35) 0%, rgba(255,122,69,0.2) 50%, transparent 70%)"
                : mood === "thinking"
                ? "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(96,165,250,0.15) 50%, transparent 70%)"
                : "radial-gradient(circle, rgba(255,122,69,0.3) 0%, rgba(143,191,159,0.15) 50%, transparent 70%)",
          }}
        />

        {/* Orbit Ring */}
        <div className="absolute inset-2 sm:inset-3 pointer-events-none">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 200 200">
            <ellipse
              cx="100"
              cy="105"
              rx="90"
              ry="32"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              className="opacity-30"
              transform="rotate(-14 100 105)"
            />
            {/* Orbiting Sparkle Satellite */}
            <g transform="rotate(-14 100 105)">
              <circle
                cx="190"
                cy="105"
                r="4.5"
                fill="var(--color-accent)"
                className="animate-pulse"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 100 105"
                  to="360 100 105"
                  dur="10s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          </svg>
        </div>

        {/* Floating Mascot Body */}
        <div
          className={`w-full h-full transition-transform duration-300 ${
            isHovered ? "scale-105" : ""
          } animate-bot-float`}
        >
          <svg
            viewBox="0 0 200 210"
            className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
          >
            <defs>
              {/* Bot Body Gradient */}
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e2621" />
                <stop offset="50%" stopColor="#151b17" />
                <stop offset="100%" stopColor="#0b0e0c" />
              </linearGradient>

              {/* Visor Gradient */}
              <linearGradient id="visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#060807" />
                <stop offset="100%" stopColor="#0d120f" />
              </linearGradient>

              {/* Capsule Eye Glow Gradient */}
              <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff9468" />
                <stop offset="100%" stopColor="#ff7a45" />
              </linearGradient>

              <linearGradient id="eyeLoveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>

              <linearGradient id="eyeThinkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>

              {/* Visor Glare Reflection */}
              <linearGradient id="glareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>

              {/* Rosy Cheek Filter */}
              <filter id="cheekBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" />
              </filter>
            </defs>

            {/* Antenna Stalk & Glowing Bulb */}
            <g className="transition-transform duration-300">
              <path
                d="M 100 48 L 100 24"
                stroke="#354037"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle
                cx="100"
                cy="18"
                r="7"
                fill={
                  mood === "love"
                    ? "#f472b6"
                    : mood === "thinking"
                    ? "#c084fc"
                    : "#ff7a45"
                }
                className="transition-colors duration-300"
              />
              <circle
                cx="100"
                cy="18"
                r="11"
                fill={
                  mood === "love"
                    ? "#f472b6"
                    : mood === "thinking"
                    ? "#c084fc"
                    : "#ff7a45"
                }
                opacity="0.3"
                className="animate-pulse"
              />
            </g>

            {/* Left Ear Cap */}
            <rect
              x="22"
              y="94"
              width="10"
              height="32"
              rx="5"
              fill="#232b25"
              stroke="#354037"
              strokeWidth="1.5"
            />
            {/* Right Ear Cap */}
            <rect
              x="168"
              y="94"
              width="10"
              height="32"
              rx="5"
              fill="#232b25"
              stroke="#354037"
              strokeWidth="1.5"
            />

            {/* Waving Arm / Hand */}
            {mood === "waving" && (
              <g className="animate-cute-wave" style={{ transformOrigin: "168px 110px" }}>
                <path
                  d="M 166 110 Q 186 90 188 70"
                  stroke="#354037"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="188" cy="68" r="9" fill="#ff7a45" />
                <circle cx="184" cy="62" r="3" fill="#ff9468" />
              </g>
            )}

            {/* Main Robot Body (Cute rounded squircle) */}
            <rect
              x="28"
              y="44"
              width="144"
              height="138"
              rx="46"
              fill="url(#bodyGrad)"
              stroke="#354037"
              strokeWidth="2"
            />

            {/* Subtle Metallic Bevel Highlight */}
            <rect
              x="30"
              y="46"
              width="140"
              height="134"
              rx="44"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1.5"
            />

            {/* Dark Visor Screen */}
            <rect
              x="42"
              y="62"
              width="116"
              height="96"
              rx="32"
              fill="url(#visorGrad)"
              stroke="#232b25"
              strokeWidth="2"
            />

            {/* Visor Diagonal Glare Shine */}
            <path
              d="M 46 80 C 60 66, 110 64, 150 78 C 145 70, 110 65, 52 74 Z"
              fill="url(#glareGrad)"
            />

            {/* Rosy Cheeks (Happy or Love mode) */}
            {(mood === "happy" || mood === "love") && (
              <g className="transition-opacity duration-300">
                <circle
                  cx="58"
                  cy="126"
                  r="9"
                  fill={mood === "love" ? "#f472b6" : "#ff7a45"}
                  opacity="0.65"
                  filter="url(#cheekBlur)"
                />
                <circle
                  cx="142"
                  cy="126"
                  r="9"
                  fill={mood === "love" ? "#f472b6" : "#ff7a45"}
                  opacity="0.65"
                  filter="url(#cheekBlur)"
                />
              </g>
            )}

            {/* ================= CAPSULE EYES ENGINE ================= */}
            <g
              transform={`translate(${eyeOffset.x}, ${eyeOffset.y})`}
              className="transition-transform duration-100 ease-out"
            >
              {/* EYE RENDERING BY MOOD */}
              {mood === "happy" ? (
                /* Cute ^ ^ Crescent Eyes */
                <g className="transition-all duration-200">
                  <path
                    d="M 68 108 Q 78 94 88 108"
                    fill="none"
                    stroke="#ff9468"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 112 108 Q 122 94 132 108"
                    fill="none"
                    stroke="#ff9468"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  {/* Happy Smile */}
                  <path
                    d="M 94 124 Q 100 131 106 124"
                    fill="none"
                    stroke="#ff7a45"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </g>
              ) : mood === "love" ? (
                /* Heart Eyes */
                <g className="transition-all duration-200">
                  <path
                    d="M 78 98 C 74 91 66 93 66 100 C 66 108 78 116 78 116 C 78 116 90 108 90 100 C 90 93 82 91 78 98 Z"
                    fill="url(#eyeLoveGrad)"
                  />
                  <path
                    d="M 122 98 C 118 91 110 93 110 100 C 110 108 122 116 122 116 C 122 116 134 108 134 100 C 134 93 126 91 122 98 Z"
                    fill="url(#eyeLoveGrad)"
                  />
                </g>
              ) : mood === "thinking" ? (
                /* Thinking tilted eyes + sparkles */
                <g className="transition-all duration-200">
                  {/* Left Eye slightly squinted */}
                  <rect
                    x="71"
                    y="100"
                    width="14"
                    height="20"
                    rx="7"
                    fill="url(#eyeThinkGrad)"
                  />
                  {/* Right Eye looking up */}
                  <rect
                    x="115"
                    y="94"
                    width="14"
                    height="26"
                    rx="7"
                    fill="url(#eyeThinkGrad)"
                  />
                  {/* Little thought bubble */}
                  <circle cx="138" cy="80" r="3" fill="#c084fc" opacity="0.8" />
                  <circle cx="144" cy="72" r="4.5" fill="#c084fc" opacity="0.9" />
                </g>
              ) : (
                /* Signature Grokbot-style Capsule Eyes */
                <g
                  style={{
                    transformOrigin: "100px 105px",
                    transform: isBlinking ? "scaleY(0.1)" : "scaleY(1)",
                    transition: "transform 0.14s ease-in-out",
                  }}
                >
                  {/* Left Capsule Eye */}
                  <rect
                    x="70"
                    y="92"
                    width="15"
                    height="32"
                    rx="7.5"
                    fill="url(#eyeGrad)"
                    className="drop-shadow-[0_0_8px_rgba(255,122,69,0.7)]"
                  />
                  {/* Left Eye Glint highlight */}
                  <ellipse cx="75" cy="98" rx="2.5" ry="4" fill="#ffffff" opacity="0.8" />

                  {/* Right Capsule Eye */}
                  <rect
                    x="115"
                    y="92"
                    width="15"
                    height="32"
                    rx="7.5"
                    fill="url(#eyeGrad)"
                    className="drop-shadow-[0_0_8px_rgba(255,122,69,0.7)]"
                  />
                  {/* Right Eye Glint highlight */}
                  <ellipse cx="120" cy="98" rx="2.5" ry="4" fill="#ffffff" opacity="0.8" />
                </g>
              )}
            </g>

            {/* Little Cute Mesh Badge on Chest */}
            <g transform="translate(90, 164)">
              <rect
                x="0"
                y="0"
                width="20"
                height="8"
                rx="4"
                fill="#232b25"
                stroke="#354037"
                strokeWidth="1"
              />
              <circle
                cx="5"
                cy="4"
                r="1.8"
                fill={mood === "love" ? "#f472b6" : "#ff7a45"}
              />
              <circle cx="10" cy="4" r="1.8" fill="#8fbf9f" />
              <circle cx="15" cy="4" r="1.8" fill="#e2b36b" />
            </g>
          </svg>
        </div>

        {/* Soft breathing shadow underneath */}
        <div className="mx-auto mt-2 h-3 w-36 rounded-full bg-black/60 blur-md animate-bot-shadow pointer-events-none" />
      </div>

      {/* Mood Selector Pill Buttons */}
      {showControls && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-line bg-panel/80 p-1 backdrop-blur-md shadow-md">
          <button
            type="button"
            onClick={() => setMood("idle")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-mono transition-all ${
              mood === "idle"
                ? "bg-accent text-void font-semibold shadow-sm"
                : "text-muted hover:text-text hover:bg-raised"
            }`}
          >
            <Bot className="h-3 w-3" />
            <span>Idle</span>
          </button>
          <button
            type="button"
            onClick={() => setMood("happy")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-mono transition-all ${
              mood === "happy"
                ? "bg-accent text-void font-semibold shadow-sm"
                : "text-muted hover:text-text hover:bg-raised"
            }`}
          >
            <Smile className="h-3 w-3" />
            <span>Happy</span>
          </button>
          <button
            type="button"
            onClick={() => setMood("thinking")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-mono transition-all ${
              mood === "thinking"
                ? "bg-accent text-void font-semibold shadow-sm"
                : "text-muted hover:text-text hover:bg-raised"
            }`}
          >
            <Brain className="h-3 w-3" />
            <span>Thinking</span>
          </button>
          <button
            type="button"
            onClick={() => setMood("love")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-mono transition-all ${
              mood === "love"
                ? "bg-rose-500 text-white font-semibold shadow-sm"
                : "text-muted hover:text-text hover:bg-raised"
            }`}
          >
            <Heart className="h-3 w-3" />
            <span>Love</span>
          </button>
          <button
            type="button"
            onClick={() => setMood("waving")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-mono transition-all ${
              mood === "waving"
                ? "bg-accent text-void font-semibold shadow-sm"
                : "text-muted hover:text-text hover:bg-raised"
            }`}
          >
            <Hand className="h-3 w-3" />
            <span>Wave</span>
          </button>
        </div>
      )}
    </div>
  )
}
