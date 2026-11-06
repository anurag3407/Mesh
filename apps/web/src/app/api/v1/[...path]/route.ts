import { getOrchestratorUrl } from "@/lib/env"

export const maxDuration = 300

async function forward(request: Request, path: string[]) {
  if (!path.length || !path.every((segment) => /^[A-Za-z0-9_-]+$/.test(segment))) {
    return new Response("not found", { status: 404 })
  }
  const url = new URL(request.url)
  const target = `${getOrchestratorUrl()}/v1/${path.join("/")}${url.search}`
  const headers = new Headers()
  for (const name of [
    "authorization",
    "content-type",
    "accept",
    "x-mesh-thread-id",
    "x-mesh-reply-to",
    "mcp-protocol-version",
    "mcp-session-id",
  ]) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body
    init.duplex = "half"
  }
  const response = await fetch(target, init)
  const responseHeaders = new Headers()
  for (const name of ["content-type", "www-authenticate", "allow", "mcp-session-id"]) {
    const value = response.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }
  return new Response(response.body, { status: response.status, headers: responseHeaders })
}

type RouteContext = { params: Promise<{ path: string[] }> }

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params
  return forward(request, path)
}

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params
  return forward(request, path)
}

export async function DELETE(request: Request, context: RouteContext) {
  const { path } = await context.params
  return forward(request, path)
}
