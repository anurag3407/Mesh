import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

export interface WebhookSignatureInput {
  secret: string
  id: string
  timestamp: number | string
  body: string
}

export interface WebhookVerifyInput {
  secret: string
  id: string | undefined
  timestamp: string | undefined
  signature: string | undefined
  body: string
  toleranceSeconds?: number
  nowSeconds?: number
}

export const WEBHOOK_TOLERANCE_SECONDS = 300

/** 32 random bytes, base64; used as the HMAC key for outbound webhooks. */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString("base64")
}

function hmac(secret: string, id: string, timestamp: string, body: string): Buffer {
  const key = Buffer.from(secret, "base64")
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest()
}

export function signWebhook(input: WebhookSignatureInput): string {
  const timestamp = String(input.timestamp)
  return `v1,${hmac(input.secret, input.id, timestamp, input.body).toString("base64")}`
}

/**
 * Verifies a Standard Webhooks style signature. Rejects stale timestamps and
 * accepts any matching `v1` signature in a space-separated list.
 */
export function verifyWebhook(input: WebhookVerifyInput): { valid: boolean; reason?: string } {
  const { id, timestamp, signature, secret, body } = input
  if (!id || !timestamp || !signature) return { valid: false, reason: "missing signature headers" }
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return { valid: false, reason: "invalid timestamp" }
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > (input.toleranceSeconds ?? WEBHOOK_TOLERANCE_SECONDS)) {
    return { valid: false, reason: "timestamp outside tolerance" }
  }
  const expected = hmac(secret, id, timestamp, body)
  const candidates = signature
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1,"))
    .map((part) => part.slice(3))
  for (const candidate of candidates) {
    const provided = Buffer.from(candidate, "base64")
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
      return { valid: true }
    }
  }
  return { valid: false, reason: "signature mismatch" }
}
