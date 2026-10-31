import { agentKeyPrefix, hashAgentApiKey } from "@mesh/core/server"
import { agentApiKeys, agents } from "@mesh/db"
import { and, eq, isNull } from "drizzle-orm"
import { getDb } from "../db"

export interface BotIdentity {
  keyId: string
  agentId: string
  orgId: string
  agent: typeof agents.$inferSelect
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function authenticateAgentKey(
  authorization: string | undefined,
): Promise<BotIdentity | null> {
  if (!authorization?.startsWith("Bearer ")) return null
  const token = authorization.slice(7).trim()
  if (!token.startsWith("mesh_ak_")) return null
  const prefix = agentKeyPrefix(token)
  const [row] = await getDb()
    .select({ key: agentApiKeys, agent: agents })
    .from(agentApiKeys)
    .innerJoin(agents, eq(agents.id, agentApiKeys.agentId))
    .where(and(eq(agentApiKeys.prefix, prefix), isNull(agentApiKeys.revokedAt)))
    .limit(1)
  if (!row) return null
  if (!safeEqualHex(hashAgentApiKey(token), row.key.keyHash)) return null
  if (!row.key.scopes.includes("messages:write")) return null
  void getDb()
    .update(agentApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(agentApiKeys.id, row.key.id))
    .catch(() => {})
  return { keyId: row.key.id, agentId: row.agent.id, orgId: row.agent.orgId, agent: row.agent }
}
