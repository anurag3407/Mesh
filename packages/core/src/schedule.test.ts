import { describe, expect, it } from "vitest"
import {
  durationLabel,
  formatMinutes,
  isWithinWindow,
  minutesInTimeZone,
  parseTimeToMinutes,
} from "./schedule"

describe("time parsing", () => {
  it("parses valid times and rejects junk", () => {
    expect(parseTimeToMinutes("09:30")).toBe(570)
    expect(parseTimeToMinutes("17:05")).toBe(1025)
    expect(parseTimeToMinutes("24:00")).toBeNull()
    expect(parseTimeToMinutes("9:30")).toBeNull()
  })

  it("formats minutes back to a time", () => {
    expect(formatMinutes(570)).toBe("09:30")
    expect(formatMinutes(1440)).toBe("00:00")
  })

  it("handles normal and overnight windows", () => {
    expect(isWithinWindow(600, 540, 660)).toBe(true)
    expect(isWithinWindow(540, 540, 660)).toBe(true)
    expect(isWithinWindow(660, 540, 660)).toBe(false)
    expect(isWithinWindow(1380, 1320, 120)).toBe(true)
    expect(isWithinWindow(60, 1320, 120)).toBe(true)
    expect(isWithinWindow(600, 1320, 120)).toBe(false)
  })

  it("reads local minutes in a time zone", () => {
    const date = new Date("2026-10-31T00:00:00Z")
    expect(minutesInTimeZone(date, "UTC")).toBe(0)
    expect(minutesInTimeZone(date, "Asia/Kolkata")).toBe(330)
  })

  it("labels durations", () => {
    expect(durationLabel(10)).toBe("10 min")
    expect(durationLabel(90)).toBe("1h 30m")
  })
})
