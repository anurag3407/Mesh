const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "aws_access_key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { name: "anthropic_key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: "openai_key", re: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/g },
  { name: "github_token", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/g },
  { name: "github_pat", re: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g },
  { name: "slack_token", re: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g },
  { name: "google_api_key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: "groq_key", re: /\bgsk_[A-Za-z0-9]{40,}\b/g },
  { name: "mesh_agent_key", re: /\bmesh_ak_[A-Za-z0-9]{24,}\b/g },
  { name: "jwt", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: "private_key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
]

export interface RedactionResult {
  text: string
  redactions: { name: string; count: number }[]
}

/** Replaces secret-looking substrings with `[REDACTED:<kind>]`. */
export function redactSecrets(input: string): RedactionResult {
  let text = input
  const redactions: RedactionResult["redactions"] = []
  for (const { name, re } of PATTERNS) {
    let count = 0
    text = text.replace(re, () => {
      count++
      return `[REDACTED:${name}]`
    })
    if (count) redactions.push({ name, count })
  }
  return { text, redactions }
}
