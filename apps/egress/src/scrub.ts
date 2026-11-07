export function scrubResponseText(text: string, secretsToPlaceholder: Map<string, string>): string {
  if (secretsToPlaceholder.size === 0) return text
  let result = text
  for (const [secret, placeholder] of secretsToPlaceholder.entries()) {
    if (!secret || secret.length < 4) continue
    result = result.replaceAll(secret, placeholder)
    // Also scrub base64-encoded secret
    try {
      const b64 = Buffer.from(secret).toString("base64")
      if (b64.length >= 8) {
        result = result.replaceAll(b64, placeholder)
      }
    } catch {}
    // Also scrub URL-encoded secret
    try {
      const urlEnc = encodeURIComponent(secret)
      if (urlEnc !== secret) {
        result = result.replaceAll(urlEnc, placeholder)
      }
    } catch {}
  }
  return result
}
