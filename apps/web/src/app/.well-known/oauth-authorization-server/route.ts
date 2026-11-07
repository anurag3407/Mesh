import { getAppUrl } from "@/lib/env"
import { NextResponse } from "next/server"

export async function GET() {
  const base = getAppUrl().replace(/\/+$/, "")
  return NextResponse.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [
      "room:read",
      "room:write",
      "tasks:read",
      "tasks:write",
      "canvas:read",
      "canvas:write",
      "secrets:use",
    ],
  })
}
