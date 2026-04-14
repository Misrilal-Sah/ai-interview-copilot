// src/providers/adapters/cohere.ts — Cohere v2 adapter
import type { FullProviderAdapter, ProviderConfig, ProviderResponse } from "../types"

const config: ProviderConfig = {
  id: "cohere",
  name: "Cohere",
  supportsVision: false,
  defaultModel: "command-r-08-2024",
  models: [
    "command-r-plus-08-2024",
    "command-r-08-2024",
    "command-r7b-12-2024"
  ],
  baseUrl: "https://api.cohere.com/v2",
  isFree: false,
  description: "Strong reasoning and RAG capabilities. Text only.",
  signupUrl: "https://dashboard.cohere.com/"
}

async function call(
  apiKey: string,
  prompt: string,
  _imageBase64: string | null,
  model: string,
  systemPrompt: string
): Promise<ProviderResponse> {
  const messages: Array<{ role: string; content: string }> = []
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt })
  messages.push({ role: "user", content: prompt })

  try {
    const res = await fetch(`${config.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Client-Name": "ai-screen-assistant"
      },
      body: JSON.stringify({ model, messages, max_tokens: 8192 })
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      if (res.status === 401) return { text: "", providerId: "cohere", model, error: `Invalid API key for ${config.name}. Please check your key in Settings.` }
      if (res.status === 429) return { text: "", providerId: "cohere", model, error: `Rate limit reached for ${config.name}. The app will try the next provider.` }
      return { text: "", providerId: "cohere", model, error: `API error ${res.status}: ${errText}` }
    }

    const data = await res.json()
    // Cohere v2 returns message.content[0].text; fallback to top-level text
    const text: string =
      data?.message?.content?.[0]?.text ??
      data?.text ??
      ""
    return { text, providerId: "cohere", model }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { text: "", providerId: "cohere", model, error: `Network error: could not reach ${config.name}. ${msg}` }
  }
}

export const cohereAdapter: FullProviderAdapter = { config, call }
