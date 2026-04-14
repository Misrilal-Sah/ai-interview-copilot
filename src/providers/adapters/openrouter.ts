// src/providers/adapters/openrouter.ts — OpenRouter adapter (hundreds of models)
import type { FullProviderAdapter, ProviderConfig, ProviderResponse } from "../types"

const config: ProviderConfig = {
  id: "openrouter",
  name: "OpenRouter",
  supportsVision: (model: string) =>
    model.includes("vision") ||
    model.includes("llava") ||
    model.includes("pixtral") ||
    model.includes("gpt-4o") ||
    model.includes("gemini"),
  defaultModel: "",
  models: "freetext",
  baseUrl: "https://openrouter.ai/api/v1",
  isFree: true,
  description: "Access hundreds of models including free ones. Type any model ID.",
  signupUrl: "https://openrouter.ai/"
}

async function call(
  apiKey: string,
  prompt: string,
  imageBase64: string | null,
  model: string,
  systemPrompt: string
): Promise<ProviderResponse> {
  if (!model || model.trim() === "") {
    return {
      text: "",
      providerId: "openrouter",
      model,
      error: "No model selected for OpenRouter. Please type a model ID in Settings → Models."
    }
  }

  const supportsVision = typeof config.supportsVision === "function"
    ? config.supportsVision(model)
    : config.supportsVision

  const userContent = supportsVision && imageBase64
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
      ]
    : prompt

  const messages: object[] = []
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt })
  messages.push({ role: "user", content: userContent })

  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/ai-screen-assistant",
        "X-Title": "AI Screen Assistant"
      },
      body: JSON.stringify({ model, messages, max_tokens: 8192 })
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      if (res.status === 401) return { text: "", providerId: "openrouter", model, error: `Invalid API key for ${config.name}. Please check your key in Settings.` }
      if (res.status === 429) return { text: "", providerId: "openrouter", model, error: `Rate limit reached for ${config.name}. The app will try the next provider.` }
      return { text: "", providerId: "openrouter", model, error: `API error ${res.status}: ${errText}` }
    }

    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ""
    return { text, providerId: "openrouter", model }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { text: "", providerId: "openrouter", model, error: `Network error: could not reach ${config.name}. ${msg}` }
  }
}

export const openrouterAdapter: FullProviderAdapter = { config, call }
