import { distance } from "fastest-levenshtein"

/** Lowercases, strips punctuation/markdown and collapses whitespace. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_>#~[\]()!.,:;?"'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** 1 = identical, 0 = completely different (normalized Levenshtein). */
export function levenshteinSimilarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  const max = Math.max(na.length, nb.length)
  if (max === 0) return 1
  return 1 - distance(na, nb) / max
}

/** Cosine similarity over word-count vectors. */
export function tokenCosine(a: string, b: string): number {
  const vec = (s: string) => {
    const m = new Map<string, number>()
    for (const w of normalize(s).split(" ")) if (w) m.set(w, (m.get(w) ?? 0) + 1)
    return m
  }
  const va = vec(a)
  const vb = vec(b)
  let dot = 0
  for (const [w, c] of va) dot += c * (vb.get(w) ?? 0)
  const mag = (v: Map<string, number>) => Math.sqrt([...v.values()].reduce((s, c) => s + c * c, 0))
  const denom = mag(va) * mag(vb)
  return denom === 0 ? 0 : dot / denom
}

const AGREEMENT_RE =
  /^(?:(?:i|we) (?:fully |completely |totally )?agree|thank(?:s| you)|great (?:point|suggestion)|sounds good|exactly|absolutely|well said|you(?:'re| are) right)\b/

const SUBSTANTIVE_RE = /\b(but|however|though|although|yet|because|unless|needs?|should|must)\b/

/** True if the text is a short, content-free agreement ("I agree with Bot A"). */
export function isPoliteAgreement(text: string): boolean {
  const n = normalize(text)
  if (n.length >= 240) return false
  if (!AGREEMENT_RE.test(n)) return false
  if (SUBSTANTIVE_RE.test(n)) return false
  return n.split(" ").length <= 14
}

export interface RepetitionOptions {
  levenshteinThreshold?: number
  cosineThreshold?: number
  /** How many recent bot messages to compare against. */
  window?: number
}

/**
 * Detects circular bot chatter: the candidate is near-identical to a recent bot message,
 * or the last two bot messages plus the candidate are all empty agreements.
 */
export function detectRepetition(
  candidate: string,
  recentBotMessages: string[],
  opts: RepetitionOptions = {},
): { repeating: boolean; reason?: string } {
  const { levenshteinThreshold = 0.85, cosineThreshold = 0.92, window = 4 } = opts
  const recent = recentBotMessages.slice(-window)
  for (const prev of recent) {
    const lev = levenshteinSimilarity(candidate, prev)
    if (lev >= levenshteinThreshold)
      return { repeating: true, reason: `near-duplicate reply (levenshtein ${lev.toFixed(2)})` }
    const cos = tokenCosine(candidate, prev)
    if (cos >= cosineThreshold && normalize(candidate).length > 40)
      return { repeating: true, reason: `near-duplicate reply (cosine ${cos.toFixed(2)})` }
  }
  const lastTwo = recent.slice(-2)
  if (lastTwo.length === 2 && [...lastTwo, candidate].every(isPoliteAgreement))
    return { repeating: true, reason: "circular agreement loop" }
  return { repeating: false }
}
