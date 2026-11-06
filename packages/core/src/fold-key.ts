/**
 * Normalizes question text for deduplication:
 * - Trims and lowercases.
 * - Strips pleasantries and framing prefixes (hey, please, could you, can you, question:).
 * - Strips non-alphanumeric punctuation.
 * - Collapses whitespace.
 */
export function normalizeQuestion(text: string): string {
  if (!text) return ""
  // Replace non-alphanumeric characters with spaces, lowercase, and collapse whitespace
  let normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  // Iteratively strip common framing prefixes
  let prev = ""
  while (prev !== normalized) {
    prev = normalized
    normalized = normalized
      .replace(/^(hey|hi|hello|please|could you|can you|do you|question|urgent)\s+/gi, "")
      .trim()
  }

  return normalized
}

/**
 * Deterministic, isomorphic 128-bit hash (FNV-1a variant) for folding keys.
 * Client and server safe without node:crypto.
 */
function hash128(text: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x811c9dc5 ^ 0x5a5a5a5a
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 ^= ch
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= ch
    h2 = Math.imul(h2, 0x01000193)
    h2 ^= h1 >>> 16
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, "0")
  const p2 = (h2 >>> 0).toString(16).padStart(8, "0")
  const p3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0")
  const p4 = ((Math.imul(h1, 31) + h2) >>> 0).toString(16).padStart(8, "0")
  return `${p1}${p2}${p3}${p4}`
}

/**
 * Generates a stable fold key for a question.
 * If an explicit foldKey is passed, that is used (normalized).
 * Otherwise, the normalized question is hashed deterministically.
 */
export function computeFoldKey(question: string, explicitFoldKey?: string | null): string {
  if (explicitFoldKey && explicitFoldKey.trim().length > 0) {
    return explicitFoldKey.trim().toLowerCase()
  }
  const normalized = normalizeQuestion(question)
  return hash128(normalized)
}
