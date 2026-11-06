// Liveness probe for Docker and nginx. Excluded from the auth proxy so it never
// touches Supabase; it only proves the Next.js server is up and serving.
export const dynamic = "force-dynamic"

export function GET() {
  return Response.json(
    { ok: true, service: "mesh-web", commit: process.env.GIT_COMMIT_SHA ?? null },
    { headers: { "cache-control": "no-store" } },
  )
}
