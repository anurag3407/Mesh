/** Starting points for the model field. The field stays free text, so any model id still works. */
export const MODEL_SUGGESTIONS: Record<string, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"],
  anthropic: ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"],
  google: ["gemini-2.5-flash", "gemini-2.5-pro"],
  groq: ["llama-3.3-70b-versatile"],
  cerebras: ["llama-3.3-70b"],
  "openai-compatible": [],
}

export function defaultModel(provider: string): string {
  return MODEL_SUGGESTIONS[provider]?.[0] ?? ""
}
