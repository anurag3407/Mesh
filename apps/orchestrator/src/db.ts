import { createDb, type Db, type DbPool } from "@mesh/db"
import { getEnv } from "./env"

let state: { db: Db; pool: DbPool } | null = null

export function getDb(): Db {
  return getState().db
}

export function getPool(): DbPool {
  return getState().pool
}

function getState() {
  if (!state) state = createDb(getEnv().DATABASE_URL)
  return state
}

export async function closeDb(): Promise<void> {
  if (!state) return
  await state.pool.end()
  state = null
}

/**
 * Serializes every turn for a room across orchestrator instances. Uses a
 * dedicated connection because session advisory locks are connection-scoped.
 */
export async function withRoomLock<T>(roomId: string, fn: () => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  const key = `mesh:room:${roomId}`
  try {
    await client.query("select pg_advisory_lock(hashtext($1)::bigint)", [key])
    return await fn()
  } finally {
    try {
      await client.query("select pg_advisory_unlock(hashtext($1)::bigint)", [key])
    } finally {
      client.release()
    }
  }
}

export async function notify(channel: string, payload: unknown): Promise<void> {
  await getPool().query("select pg_notify($1, $2)", [channel, JSON.stringify(payload)])
}
