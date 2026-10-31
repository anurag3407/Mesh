import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import { createDb, requireDatabaseUrl } from "./client"
import { modelPricing } from "./schema/ops"

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true })

const { db, pool } = createDb(requireDatabaseUrl())

const pricing = [
  { provider: "openai", model: "gpt-4o", inputPerMtok: 2.5, outputPerMtok: 10 },
  { provider: "openai", model: "gpt-4o-mini", inputPerMtok: 0.15, outputPerMtok: 0.6 },
  { provider: "openai", model: "gpt-4.1", inputPerMtok: 2, outputPerMtok: 8 },
  { provider: "openai", model: "gpt-4.1-mini", inputPerMtok: 0.4, outputPerMtok: 1.6 },
  { provider: "openai", model: "o3-mini", inputPerMtok: 1.1, outputPerMtok: 4.4 },
  { provider: "anthropic", model: "claude-sonnet-4-20250514", inputPerMtok: 3, outputPerMtok: 15 },
  { provider: "anthropic", model: "claude-opus-4-20250514", inputPerMtok: 15, outputPerMtok: 75 },
  { provider: "anthropic", model: "claude-3-5-haiku-latest", inputPerMtok: 0.8, outputPerMtok: 4 },
  { provider: "google", model: "gemini-2.5-pro", inputPerMtok: 1.25, outputPerMtok: 10 },
  { provider: "google", model: "gemini-2.5-flash", inputPerMtok: 0.3, outputPerMtok: 2.5 },
  { provider: "groq", model: "llama-3.3-70b-versatile", inputPerMtok: 0.59, outputPerMtok: 0.79 },
  { provider: "cerebras", model: "llama-3.3-70b", inputPerMtok: 0.85, outputPerMtok: 1.2 },
]

try {
  await db.insert(modelPricing).values(pricing).onConflictDoNothing()
  console.log(`Seeded ${pricing.length} model prices (existing rows untouched).`)
} finally {
  await pool.end()
}
