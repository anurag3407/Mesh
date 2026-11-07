import { promises as dns } from "node:dns"
import { isIP } from "node:net"

export function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true

  // IPv4 checks
  if (isIP(ip) === 4) {
    const parts = ip.split(".").map(Number)
    const [a, b] = parts

    // Loopback 127.0.0.0/8
    if (a === 127) return true
    // RFC1918: 10.0.0.0/8
    if (a === 10) return true
    // RFC1918: 172.16.0.0/12
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true
    // RFC1918: 192.168.0.0/16
    if (a === 192 && b === 168) return true
    // Link-local / AWS metadata: 169.254.0.0/16
    if (a === 169 && b === 254) return true
    // CGNAT: 100.64.0.0/10
    if (a === 100 && b !== undefined && b >= 64 && b <= 127) return true
    // 0.0.0.0/8
    if (a === 0) return true
    return false
  }

  // IPv6 checks
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase()
    if (lower === "::1" || lower === "::") return true
    if (lower.startsWith("fe80:") || lower.startsWith("fc00:") || lower.startsWith("fd00:")) return true
    return false
  }

  return true
}

export async function assertSafeEgressHost(hostname: string): Promise<string[]> {
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`SSRF blocked: IP ${hostname} is private or restricted`)
    }
    return [hostname]
  }

  const addresses = await dns.lookup(hostname, { all: true }).catch((err) => {
    throw new Error(`DNS resolution failed for ${hostname}: ${err.message}`)
  })

  if (!addresses || addresses.length === 0) {
    throw new Error(`DNS resolution returned no addresses for ${hostname}`)
  }

  for (const addr of addresses) {
    if (isPrivateIp(addr.address)) {
      throw new Error(`SSRF blocked: ${hostname} resolved to restricted IP ${addr.address}`)
    }
  }

  return addresses.map((a) => a.address)
}
