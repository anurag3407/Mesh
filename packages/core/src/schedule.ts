/** Minutes since local midnight for a time zone. */
export function minutesInTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0)
  return hour * 60 + minute
}

/** Parses an HTML time input value ("09:30") into minutes, or null. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function formatMinutes(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440
  const hour = Math.floor(normalized / 60)
  const minute = normalized % 60
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

/** True when a local minute falls in a window, including overnight windows. */
export function isWithinWindow(minute: number, start: number, end: number): boolean {
  if (start === end) return false
  return start < end ? minute >= start && minute < end : minute >= start || minute < end
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}
