// src/providers/adapters/mistral.ts — Mistral La Plateforme adapter
import type { FullProviderAdapter, ProviderConfig, ProviderResponse } from "../types"

const config: ProviderConfig = {
  id: "mistral",
  name: "Mistral La Plateforme",
  supportsVision: (model: string) => model.includes("pixtral"),
  defaultModel: "mistral-small-latest",
  models: [
    "mistral-small-latest",
    "mistral-medium-latest",
    "mistral-large-latest",
    "pixtral-12b-2409",
    "pixtral-large-latest"
  ],
  baseUrl: "https://api.mistral.ai/v1",
  isFree: false,
  description: "High quality European AI. Pixtral models support vision.",
  signupUrl: "https://console.mistral.ai/"
}

async function call(
  apiKey: string,
  prompt: string,
  imageBase64: string | null,
  model: string,
  systemPrompt: string
): Promise<ProviderResponse> {
  const isVisionModel = model.includes("pixtral")
  const userContent = isVisionModel && imageBase64
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
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, messages, max_tokens: 8192 })
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      if (res.status === 401) return { text: "", providerId: "mistral", model, error: `Invalid API key for ${config.name}. Please check your key in Settings.` }
      if (res.status === 429) return { text: "", providerId: "mistral", model, error: `Rate limit reached for ${config.name}. The app will try the next provider.` }
      return { text: "", providerId: "mistral", model, error: `API error ${res.status}: ${errText}` }
    }

    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ""
    return { text, providerId: "mistral", model }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { text: "", providerId: "mistral", model, error: `Network error: could not reach ${config.name}. ${msg}` }
  }
}

export const mistralAdapter: FullProviderAdapter = { config, call }
