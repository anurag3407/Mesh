import { defineConfig } from "drizzle-kit"
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true })

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
})
