import { describe, expect, it } from "vitest"
import { MissingModelConfigError, createLanguageModel, devModelConfig } from "./registry"

function modelIdOf(model: ReturnType<typeof createLanguageModel>): string {
  return typeof model === "string" ? model : model.modelId
}

describe("createLanguageModel", () => {
  it("creates a model for each native provider", () => {
    for (const provider of ["openai", "anthropic", "google", "groq", "cerebras"] as const) {
      const model = createLanguageModel({ provider, apiKey: "test", model: "test-model" })
      expect(modelIdOf(model)).toBe("test-model")
    }
  })

  it("requires a base URL for openai-compatible endpoints", () => {
    expect(() =>
      createLanguageModel({ provider: "openai-compatible", apiKey: "test", model: "llama3" }),
    ).toThrow(MissingModelConfigError)
  })

  it("creates an openai-compatible model", () => {
    const model = createLanguageModel({
      provider: "openai-compatible",
      apiKey: "test",
      model: "llama3.1",
      baseUrl: "http://localhost:11434/v1",
    })
    expect(modelIdOf(model)).toBe("llama3.1")
  })
})

describe("devModelConfig", () => {
  it("returns null unless all three dev model vars are present", () => {
    expect(devModelConfig({})).toBeNull()
    expect(
      devModelConfig({ DEV_OPENAI_COMPAT_BASE_URL: "http://x", DEV_OPENAI_COMPAT_MODEL: "m" }),
    ).toBeNull()
  })

  it("builds the dev fallback config", () => {
    expect(
      devModelConfig({
        DEV_OPENAI_COMPAT_BASE_URL: "http://localhost:11434/v1",
        DEV_OPENAI_COMPAT_API_KEY: "dev",
        DEV_OPENAI_COMPAT_MODEL: "llama3.1",
      }),
    ).toEqual({
      provider: "openai-compatible",
      baseUrl: "http://localhost:11434/v1",
      apiKey: "dev",
      model: "llama3.1",
    })
  })
})
