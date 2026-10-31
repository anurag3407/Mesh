import { createHash, randomBytes } from "node:crypto"

export interface GeneratedAgentApiKey {
  token: string
  prefix: string
  hash: string
  last4: string
}

export function hashAgentApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function agentKeyPrefix(token: string): string {
  return token.slice(0, 16)
}

export function generateAgentApiKey(): GeneratedAgentApiKey {
  const token = `mesh_ak_${randomBytes(32).toString("base64url")}`
  return {
    token,
    prefix: agentKeyPrefix(token),
    hash: hashAgentApiKey(token),
    last4: token.slice(-4),
  }
}
