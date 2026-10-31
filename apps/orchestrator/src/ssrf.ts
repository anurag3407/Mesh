import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

function isGlobalIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false
  const [a, b] = parts as [number, number, number, number]
  if (a === 0 || a === 10 || a === 127) return false
  if (a === 100 && b >= 64 && b <= 127) return false
  if (a === 169 && b === 254) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && b === 168) return false
  if (a === 192 && b === 0) return false
  if (a === 198 && (b === 18 || b === 19)) return false
  if (a >= 224) return false
  return true
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return !isGlobalIpv4(ip)
  if (version === 6) {
    const lower = ip.toLowerCase()
    if (lower === "::1" || lower === "::") return true
    if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7))
    const [head, second] = lower.split(":")
    const firstGroup = Number.parseInt(head || "0", 16)
    if ((firstGroup & 0xfe00) === 0xfc00) return true
    if ((firstGroup & 0xffc0) === 0xfe80) return true
    if ((firstGroup & 0xff00) === 0xff00) return true
    if (firstGroup === 0x2001 && second === "db8") return true
    return false
  }
  return true
}

/**
 * Blocks webhook targets that resolve to loopback, link-local or private
 * networks. DNS is re-checked on every delivery attempt.
 */
export async function assertSafeWebhookUrl(raw: string, allowPrivate: boolean): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error("invalid webhook URL")
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("webhook URL must use http or https")
  }
  if (url.username || url.password) throw new Error("webhook URL must not contain credentials")
  if (allowPrivate) return url
  const host = url.hostname.toLowerCase()
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("webhook URL resolves to a private host")
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("webhook URL points at a private address")
    return url
  }
  const addresses = await lookup(host, { all: true, verbatim: true })
  if (addresses.length === 0) throw new Error("webhook host did not resolve")
  for (const address of addresses) {
    if (isPrivateIp(address.address)) throw new Error("webhook host resolves to a private address")
  }
  return url
}
