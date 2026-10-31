import dotenv from "dotenv"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { createDb } from "./client"

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true })

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL is not set (expected in the repo root .env)")
  process.exit(1)
}

const { db, pool } = createDb(url)

try {
  console.log("Running Drizzle migrations…")
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)) })

  const sqlDir = new URL("../sql/", import.meta.url)
  if (existsSync(sqlDir)) {
    const files = readdirSync(sqlDir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
    for (const file of files) {
      console.log(`Applying ${file}…`)
      const text = readFileSync(new URL(file, sqlDir), "utf8")
      await pool.query(text)
    }
  }
  console.log("Migrations complete.")
} catch (error) {
  console.error("Migration failed:", error)
  process.exitCode = 1
} finally {
  await pool.end()
}
