// src/providers/adapters/cerebras.ts — Cerebras adapter (OpenAI-compatible, text only)
import type { FullProviderAdapter, ProviderConfig, ProviderResponse } from "../types"

const config: ProviderConfig = {
  id: "cerebras",
  name: "Cerebras",
  supportsVision: false,
  defaultModel: "llama-3.3-70b",
  models: [
    "llama-3.3-70b",
    "llama3.1-8b",
    "llama-4-scout-17b-16e-instruct"
  ],
  baseUrl: "https://api.cerebras.ai/v1",
  isFree: true,
  description: "Ultra-fast inference. Text only.",
  signupUrl: "https://cloud.cerebras.ai/"
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
      if (res.status === 401) return { text: "", providerId: "cerebras", model, error: `Invalid API key for ${config.name}. Please check your key in Settings.` }
      if (res.status === 429) return { text: "", providerId: "cerebras", model, error: `Rate limit reached for ${config.name}. The app will try the next provider.` }
      return { text: "", providerId: "cerebras", model, error: `API error ${res.status}: ${errText}` }
    }

    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ""
    return { text, providerId: "cerebras", model }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { text: "", providerId: "cerebras", model, error: `Network error: could not reach ${config.name}. ${msg}` }
  }
}

export const cerebrasAdapter: FullProviderAdapter = { config, call }
