// src/providers/adapters/gemini.ts — Google AI Studio adapter
import type { FullProviderAdapter, ProviderConfig, ProviderResponse } from "../types"

const config: ProviderConfig = {
  id: "gemini",
  name: "Google AI Studio",
  supportsVision: true,
  defaultModel: "gemini-2.0-flash",
  models: [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.5-pro-preview-03-25"
  ],
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/",
  isFree: true,
  requiresAccountId: false,
  description: "Free tier with 1500 requests/day. Best free vision option.",
  signupUrl: "https://aistudio.google.com/"
}

async function call(
  apiKey: string,
  prompt: string,
  imageBase64: string | null,
  model: string,
  systemPrompt: string
): Promise<ProviderResponse> {
  const url = `${config.baseUrl}models/${model}:generateContent?key=${apiKey}`

  const parts: object[] = []
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: "image/png", data: imageBase64 } })
  }
  parts.push({ text: prompt })

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: { maxOutputTokens: 8192 }
  }
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] }
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      if (res.status === 401) {
        return { text: "", providerId: "gemini", model, error: `Invalid API key for ${config.name}. Please check your key in Settings.` }
      }
      if (res.status === 429) {
        return { text: "", providerId: "gemini", model, error: `Rate limit reached for ${config.name}. The app will try the next provider.` }
      }
      return { text: "", providerId: "gemini", model, error: `API error ${res.status}: ${errText}` }
    }

    const data = await res.json()
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    return { text, providerId: "gemini", model }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { text: "", providerId: "gemini", model, error: `Network error: could not reach ${config.name}. ${msg}` }
  }
}

export const geminiAdapter: FullProviderAdapter = { config, call }
