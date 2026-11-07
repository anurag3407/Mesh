import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  MESH_KEK: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ORCHESTRATOR_INTERNAL_SECRET: z.string().min(16),
  PORT: z.coerce.number().int().positive().default(4000),
  COMPUTERD_URL: z.string().default("http://localhost:4100"),
  EGRESS_URL: z.string().default("http://localhost:8081"),
  EGRESS_PROXY_URL: z.string().default("http://localhost:8080"),
  COMPUTE_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  E2B_API_KEY: z.string().optional(),
  BRAVE_SEARCH_API_KEY: z.string().optional(),
  MESH_ALLOW_PRIVATE_WEBHOOKS: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  DEV_OPENAI_COMPAT_BASE_URL: z.string().optional(),
  DEV_OPENAI_COMPAT_API_KEY: z.string().optional(),
  DEV_OPENAI_COMPAT_MODEL: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = envSchema.safeParse({
    ...process.env,
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  })
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n")
    throw new Error(`Invalid orchestrator environment:\n${issues}`)
  }
  cached = parsed.data
  return cached
}

export function resetEnvCache(): void {
  cached = null
}
