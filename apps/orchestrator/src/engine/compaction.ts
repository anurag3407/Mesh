import type { ModelMessage, ToolModelMessage, UserModelMessage } from "ai"

export interface CompactedSummary {
  goal: string
  decisions: string[]
  filesTouched: string[]
  openQuestions: string[]
  planStatus: string
  factsLearned: string[]
}

export interface CompactTranscriptArgs {
  messages: ModelMessage[]
  keepLastKTools?: number
  summary?: CompactedSummary
}

export interface CompactTranscriptResult {
  messages: ModelMessage[]
  elidedCount: number
  compactedThroughIdx: number
  extractedFacts: string[]
}

/**
 * Strategy 1: Clear old tool results.
 * Keeps the most recent K=6 tool results verbatim and elides older ones.
 */
export function elideOldToolResults(
  messages: ModelMessage[],
  keepLastK = 6,
): { messages: ModelMessage[]; elidedCount: number } {
  let toolResultCount = 0

  // Count total tool results
  for (const msg of messages) {
    if (msg.role === "tool" && Array.isArray(msg.content)) {
      toolResultCount += msg.content.length
    }
  }

  if (toolResultCount <= keepLastK) {
    return { messages, elidedCount: 0 }
  }

  let resultsToElide = toolResultCount - keepLastK
  let elidedCount = 0

  const updatedMessages = messages.map((msg) => {
    if (msg.role !== "tool" || !Array.isArray(msg.content)) {
      return msg
    }

    const updatedContent = msg.content.map((part) => {
      if (part.type === "tool-result" && resultsToElide > 0) {
        resultsToElide--
        elidedCount++
        return {
          ...part,
          output: `[result elided: completed; full record in tool_calls/${part.toolCallId}]`,
        }
      }
      return part
    })

    return {
      ...msg,
      content: updatedContent,
    } as ToolModelMessage
  })

  return { messages: updatedMessages, elidedCount }
}

/**
 * Formats a structured compacted state into a clean model message.
 */
export function formatCompactedSummary(summary: CompactedSummary): string {
  const parts = [
    `[Compacted Run Summary]`,
    `Goal: ${summary.goal}`,
  ]

  if (summary.decisions.length > 0) {
    parts.push(`Decisions:\n${summary.decisions.map((d) => `- ${d}`).join("\n")}`)
  }

  if (summary.filesTouched.length > 0) {
    parts.push(`Files Touched:\n${summary.filesTouched.map((f) => `- ${f}`).join("\n")}`)
  }

  if (summary.factsLearned.length > 0) {
    parts.push(`Facts Learned:\n${summary.factsLearned.map((f) => `- ${f}`).join("\n")}`)
  }

  if (summary.openQuestions.length > 0) {
    parts.push(`Open Questions:\n${summary.openQuestions.map((q) => `- ${q}`).join("\n")}`)
  }

  if (summary.planStatus) {
    parts.push(`Plan Status: ${summary.planStatus}`)
  }

  return parts.join("\n\n")
}

/**
 * Compacts a transcript:
 * 1. Elides old tool results past the last K=6.
 * 2. If a summary is provided, collapses messages before the active tail into one compacted summary message.
 */
export function compactTranscript(args: CompactTranscriptArgs): CompactTranscriptResult {
  const { messages: elidedMessages, elidedCount } = elideOldToolResults(
    args.messages,
    args.keepLastKTools ?? 6,
  )

  if (!args.summary) {
    return {
      messages: elidedMessages,
      elidedCount,
      compactedThroughIdx: 0,
      extractedFacts: [],
    }
  }

  const summaryText = formatCompactedSummary(args.summary)
  const summaryMessage: UserModelMessage = {
    role: "user",
    content: summaryText,
  }

  // Keep the most recent 4 messages as active working tail
  const tailCount = Math.min(4, elidedMessages.length)
  const compactedThroughIdx = elidedMessages.length - tailCount
  const activeTail = elidedMessages.slice(-tailCount)

  return {
    messages: [summaryMessage, ...activeTail],
    elidedCount,
    compactedThroughIdx,
    extractedFacts: args.summary.factsLearned,
  }
}
