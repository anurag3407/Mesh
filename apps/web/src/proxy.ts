import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

const PUBLIC_PATHS = ["/login", "/auth", "/offline", "/api/v1"]

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|swe-worker|workbox).*)",
  ],
}
