import { z } from "zod"
import { getEnv } from "../../env"
import type { ToolSpec } from "../audited"

interface BraveResult {
  title?: string
  url?: string
  description?: string
}

export function webSearchTool(): ToolSpec {
  return {
    name: "web_search",
    description:
      "Search the public web with Brave and return the top results (title, URL, snippet). Use when current or external information is needed.",
    schema: z.object({
      query: z.string().min(1).max(400),
      count: z.number().int().min(1).max(10).optional(),
    }),
    dangerous: false,
    execute: async (input: { query: string; count?: number }, signal?: AbortSignal) => {
      const apiKey = getEnv().BRAVE_SEARCH_API_KEY
      if (!apiKey) {
        throw new Error("web_search is not configured. Add BRAVE_SEARCH_API_KEY to enable it.")
      }
      const params = new URLSearchParams({
        q: input.query,
        count: String(input.count ?? 5),
        text_decorations: "false",
        safesearch: "moderate",
      })
      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
        headers: {
          accept: "application/json",
          "x-subscription-token": apiKey,
        },
        signal,
      })
      if (!response.ok) throw new Error(`Brave search failed with ${response.status}`)
      const data = (await response.json()) as { web?: { results?: BraveResult[] } }
      return {
        results: (data.web?.results ?? []).slice(0, input.count ?? 5).map((r) => ({
          title: r.title ?? "",
          url: r.url ?? "",
          description: r.description ?? "",
        })),
      }
    },
  }
}
