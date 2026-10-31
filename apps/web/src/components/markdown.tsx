"use client"

import { Streamdown } from "streamdown"
import { code } from "@streamdown/code"
import { math } from "@streamdown/math"
import { mermaid } from "@streamdown/mermaid"

const plugins = { code, math, mermaid }

export function Markdown({
  content,
  streaming = false,
}: {
  content: string
  streaming?: boolean
}) {
  if (!content) return null
  return (
    <Streamdown
      className="streamdown"
      plugins={plugins}
      mode={streaming ? "streaming" : "static"}
      parseIncompleteMarkdown
    >
      {content}
    </Streamdown>
  )
}
