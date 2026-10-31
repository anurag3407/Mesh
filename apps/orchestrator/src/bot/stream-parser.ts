import { botStreamLineSchema } from "@mesh/core"

export interface ParsedBotChunk {
  deltas: string[]
  done: boolean
}

/**
 * Parses the bot streaming body. NDJSON is the default; when the content type
 * is text/event-stream, `data:` lines are parsed instead. Partial lines are
 * buffered until the next chunk.
 */
export class BotStreamParser {
  private buffer = ""
  private sawDone = false
  private readonly sse: boolean

  constructor(contentType: string) {
    this.sse = contentType.toLowerCase().includes("text/event-stream")
  }

  push(chunk: string): ParsedBotChunk {
    this.buffer += chunk
    return this.drain(false)
  }

  finish(): ParsedBotChunk {
    return this.drain(true)
  }

  private drain(final: boolean): ParsedBotChunk {
    const deltas: string[] = []
    const parts = this.buffer.split(/\r?\n/)
    this.buffer = final ? "" : (parts.pop() ?? "")
    for (const rawLine of parts) {
      if (this.sawDone) break
      const line = rawLine.trim()
      if (!line) continue
      let payload: string | null = null
      if (this.sse) {
        if (line.startsWith(":") || line.startsWith("event:") || line.startsWith("id:")) continue
        if (!line.startsWith("data:")) continue
        payload = line.slice(5).trimStart()
        if (payload === "[DONE]") {
          this.sawDone = true
          continue
        }
      } else {
        payload = line
        if (payload === "[DONE]") {
          this.sawDone = true
          continue
        }
      }
      let json: unknown
      try {
        json = JSON.parse(payload)
      } catch {
        throw new Error(`invalid bot stream line: ${payload.slice(0, 200)}`)
      }
      const parsed = botStreamLineSchema.safeParse(json)
      if (!parsed.success) {
        throw new Error(`unexpected bot stream payload: ${payload.slice(0, 200)}`)
      }
      if ("done" in parsed.data) {
        this.sawDone = true
        continue
      }
      deltas.push(parsed.data.delta)
    }
    return { deltas, done: this.sawDone }
  }
}
