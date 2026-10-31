import { createAnthropic } from "@ai-sdk/anthropic"
import { createCerebras } from "@ai-sdk/cerebras"
import { createGoogle } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModel } from "ai"
import type { Provider } from "@mesh/core"
import { decryptSecret } from "./crypto"

export interface LanguageModelConfig {
  provider: Provider
  apiKey: string
  model: string
  baseUrl?: string | null
}

export class MissingModelConfigError extends Error {}

/**
 * Maps a BYOK provider + key to an AI SDK model. Every adapter stays thin so a
 * provider breaking change is contained to this switch.
 */
export function createLanguageModel(config: LanguageModelConfig): LanguageModel {
  const { provider, apiKey, model } = config
  const baseURL = config.baseUrl || undefined
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })(model)
    case "anthropic":
      return createAnthropic({ apiKey, ...(baseURL ? { baseURL } : {}) })(model)
    case "google":
      return createGoogle({ apiKey, ...(baseURL ? { baseURL } : {}) })(model)
    case "groq":
      return createGroq({ apiKey, ...(baseURL ? { baseURL } : {}) })(model)
    case "cerebras":
      return createCerebras({ apiKey, ...(baseURL ? { baseURL } : {}) })(model)
    case "openai-compatible":
      if (!baseURL) {
        throw new MissingModelConfigError("openai-compatible providers require a base URL")
      }
      return createOpenAICompatible({ name: "mesh-compatible", baseURL, apiKey })(model)
    default:
      throw new MissingModelConfigError(`unsupported provider: ${String(provider)}`)
  }
}

/** Dev fallback used when an agent has no BYOK key attached. */
export function devModelConfig(env: NodeJS.ProcessEnv = process.env): LanguageModelConfig | null {
  const baseUrl = env.DEV_OPENAI_COMPAT_BASE_URL
  const apiKey = env.DEV_OPENAI_COMPAT_API_KEY
  const model = env.DEV_OPENAI_COMPAT_MODEL
  if (!baseUrl || !apiKey || !model) return null
  return { provider: "openai-compatible", apiKey, baseUrl, model }
}

export interface ProviderKeyRow {
  provider: Provider
  baseUrl: string | null
  ciphertext: string
  iv: string
  tag: string
}

/** Decrypts a provider_keys row. Only call this in trusted server processes. */
export function providerKeyToApiKey(row: ProviderKeyRow, kek: string): string {
  return decryptSecret({ ciphertext: row.ciphertext, iv: row.iv, tag: row.tag }, kek)
}
