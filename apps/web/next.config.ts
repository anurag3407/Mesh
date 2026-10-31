import withSerwistInit from "@serwist/next"
import type { NextConfig } from "next"

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  additionalPrecacheEntries: ["/offline", "/icon.svg", "/manifest.webmanifest"].map((url) => ({
    url,
    revision:
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.GIT_COMMIT_SHA ??
        Date.now().toString(36),
  })),
})

const nextConfig: NextConfig = {
  transpilePackages: ["@mesh/core", "@mesh/db", "@mesh/llm"],
  serverExternalPackages: ["pg", "pg-boss", "@e2b/code-interpreter"],
  poweredByHeader: false,
  turbopack: {},
}

export default withSerwist(nextConfig)
