import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import * as schema from "./schema"

export function createDb(connectionString: string) {
  const pool = new pg.Pool({ connectionString, max: 10 })
  const db = drizzle(pool, { schema })
  return { pool, db }
}

export type Db = ReturnType<typeof createDb>["db"]
export type DbPool = pg.Pool

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  return url
}
