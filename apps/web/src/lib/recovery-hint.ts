export interface RecoveryHint {
  label: string
  href: string
}

/** Maps a failed-turn message to the page where someone can actually fix it. */
export function recoveryHint(args: {
  text: string
  reason?: string | null
  orgSlug: string
  roomId: string
}): RecoveryHint | null {
  const text = `${args.reason ?? ""} ${args.text}`.toLowerCase()
  const room = `/${args.orgSlug}/r/${args.roomId}/settings`
  if (/provider key|api key|api_key|unauthori[sz]ed|\b401\b|\b403\b|incorrect api|invalid x-api/.test(text)) {
    return { label: "Check provider keys", href: `/${args.orgSlug}/settings/keys` }
  }
  if (/model.*(not found|does not exist|not available)|unknown model|\b404\b/.test(text)) {
    return { label: "Check the agent's model", href: `/${args.orgSlug}/agents` }
  }
  if (/budget|rpm|per minute|rate.?limit|turn.?cap|\bcap\b/.test(text)) {
    return { label: "Review room limits", href: room }
  }
  return null
}

export const RETRYABLE_REASONS = new Set(["agent_error", "moderator_error"])
