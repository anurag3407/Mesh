"use client"

import { useRef, useState } from "react"

export function CodeInput({ name = "code" }: { name?: string }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""))
  const refs = useRef<Array<HTMLInputElement | null>>([])

  function update(index: number, value: string) {
    const clean = value.replace(/\D/g, "")
    if (!clean) {
      setDigits((current) => current.map((digit, i) => (i === index ? "" : digit)))
      return
    }
    setDigits((current) => {
      const next = [...current]
      let cursor = index
      for (const char of clean.slice(0, 6 - index)) {
        next[cursor] = char
        cursor++
      }
      const focus = Math.min(cursor, 5)
      requestAnimationFrame(() => refs.current[focus]?.focus())
      return next
    })
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus()
    if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus()
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text) return
    event.preventDefault()
    setDigits(Array.from({ length: 6 }, (_, i) => text[i] ?? ""))
    refs.current[Math.min(text.length, 5)]?.focus()
  }

  return (
    <div>
      <input type="hidden" name={name} value={digits.join("")} />
      <div className="flex gap-2" role="group" aria-label="6-digit verification code">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element
            }}
            value={digit}
            onChange={(event) => update(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            onPaste={onPaste}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            required
            autoFocus={index === 0}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1} of 6`}
            className="h-12 w-10 rounded-sm border border-line bg-panel text-center font-mono text-lg text-text outline-none transition-colors focus:border-accent"
          />
        ))}
      </div>
    </div>
  )
}
