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

export interface ProviderCapabilities {
  supportsPromptCache: boolean
  supportsServerCompaction: boolean
  supportsContextEditing: boolean
  supportsEffort: boolean
  supportsMidConversationSystem: boolean
  supportsParallelTools: boolean
  supportsComputerUse: boolean
  defaultContextWindow: number
}

export type EffortLevel = "low" | "medium" | "high" | "max"

const PROVIDER_CAPABILITIES: Record<Provider, ProviderCapabilities> = {
  anthropic: {
    supportsPromptCache: true,
    supportsServerCompaction: false,
    supportsContextEditing: true,
    supportsEffort: true,
    supportsMidConversationSystem: true,
    supportsParallelTools: true,
    supportsComputerUse: true,
    defaultContextWindow: 200_000,
  },
  openai: {
    supportsPromptCache: true,
    supportsServerCompaction: false,
    supportsContextEditing: false,
    supportsEffort: true,
    supportsMidConversationSystem: true,
    supportsParallelTools: true,
    supportsComputerUse: false,
    defaultContextWindow: 128_000,
  },
  google: {
    supportsPromptCache: true,
    supportsServerCompaction: false,
    supportsContextEditing: false,
    supportsEffort: true,
    supportsMidConversationSystem: true,
    supportsParallelTools: true,
    supportsComputerUse: false,
    defaultContextWindow: 1_000_000,
  },
  groq: {
    supportsPromptCache: false,
    supportsServerCompaction: false,
    supportsContextEditing: false,
    supportsEffort: false,
    supportsMidConversationSystem: true,
    supportsParallelTools: true,
    supportsComputerUse: false,
    defaultContextWindow: 32_000,
  },
  cerebras: {
    supportsPromptCache: false,
    supportsServerCompaction: false,
    supportsContextEditing: false,
    supportsEffort: false,
    supportsMidConversationSystem: true,
    supportsParallelTools: true,
    supportsComputerUse: false,
    defaultContextWindow: 32_000,
  },
  "openai-compatible": {
    supportsPromptCache: false,
    supportsServerCompaction: false,
    supportsContextEditing: false,
    supportsEffort: false,
    supportsMidConversationSystem: true,
    supportsParallelTools: true,
    supportsComputerUse: false,
    defaultContextWindow: 32_000,
  },
}

export function getProviderCapabilities(provider: Provider): ProviderCapabilities {
  return PROVIDER_CAPABILITIES[provider] ?? {
    supportsPromptCache: false,
    supportsServerCompaction: false,
    supportsContextEditing: false,
    supportsEffort: false,
    supportsMidConversationSystem: true,
    supportsParallelTools: true,
    supportsComputerUse: false,
    defaultContextWindow: 32_000,
  }
}

export interface BuildProviderOptionsArgs {
  provider: Provider
  effort?: EffortLevel
  cacheBreakpoint?: boolean
}

/**
 * Builds provider-specific options for AI SDK calls in a provider-neutral way.
 */
export function buildProviderOptions(args: BuildProviderOptionsArgs): Record<string, Record<string, unknown>> {
  const { provider, effort, cacheBreakpoint } = args
  const options: Record<string, Record<string, unknown>> = {}

  if (provider === "anthropic") {
    const anthropicOpts: Record<string, unknown> = {}
    if (cacheBreakpoint) {
      anthropicOpts.cacheControl = { type: "ephemeral" }
    }
    if (effort) {
      const budgetMap: Record<EffortLevel, number> = {
        low: 1024,
        medium: 2048,
        high: 4096,
        max: 8192,
      }
      anthropicOpts.thinking = { type: "enabled", budgetTokens: budgetMap[effort] }
    }
    if (Object.keys(anthropicOpts).length > 0) {
      options.anthropic = anthropicOpts
    }
  } else if (provider === "openai") {
    const openaiOpts: Record<string, unknown> = {}
    if (effort) {
      openaiOpts.reasoningEffort = effort === "max" ? "high" : effort
    }
    if (Object.keys(openaiOpts).length > 0) {
      options.openai = openaiOpts
    }
  }

  return options
}
