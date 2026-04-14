// src/providers/adapters/groq.ts — Groq adapter (OpenAI-compatible, text only)
import type { FullProviderAdapter, ProviderConfig, ProviderResponse } from "../types"

const config: ProviderConfig = {
  id: "groq",
  name: "Groq",
  supportsVision: false,
  defaultModel: "llama-3.3-70b-versatile",
  models: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
    "deepseek-r1-distill-llama-70b"
  ],
  baseUrl: "https://api.groq.com/openai/v1",
  isFree: true,
  description: "Fastest free text model. No vision support.",
  signupUrl: "https://console.groq.com/"
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
      if (res.status === 401) return { text: "", providerId: "groq", model, error: `Invalid API key for ${config.name}. Please check your key in Settings.` }
      if (res.status === 429) return { text: "", providerId: "groq", model, error: `Rate limit reached for ${config.name}. The app will try the next provider.` }
      return { text: "", providerId: "groq", model, error: `API error ${res.status}: ${errText}` }
    }

    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ""
    return { text, providerId: "groq", model }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { text: "", providerId: "groq", model, error: `Network error: could not reach ${config.name}. ${msg}` }
  }
}

export const groqAdapter: FullProviderAdapter = { config, call }
