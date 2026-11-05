/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker"
import {
  NetworkOnly,
  Serwist,
  type PrecacheEntry,
  type RuntimeCaching,
  type SerwistGlobalConfig,
} from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Authenticated HTML and RSC payloads must never sit in a shared browser cache.
const noPageCache: RuntimeCaching = {
  matcher: ({ request, url: { pathname }, sameOrigin }) =>
    sameOrigin &&
    !pathname.startsWith("/api/") &&
    (request.mode === "navigate" || request.headers.get("RSC") === "1"),
  handler: new NetworkOnly(),
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [noPageCache, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document"
        },
      },
    ],
  },
})

serwist.addEventListeners()
