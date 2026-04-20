// src/providers/adapters/github.ts — GitHub Models adapter (OpenAI-compatible)
import type { FullProviderAdapter, ProviderConfig, ProviderResponse } from "../types"

const config: ProviderConfig = {
  id: "github",
  name: "GitHub Models",
  supportsVision: (model: string) =>
    model.includes("gpt-4o") ||
    model.includes("gpt-4.1") ||
    model.includes("claude") ||
    model.includes("gemini") ||
    model.includes("raptor"),
  defaultModel: "openai/gpt-4o",
  models: [
    // ── OpenAI models ─────────────────────────────────────────
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "openai/gpt-4.1",
    "openai/gpt-5-mini",
    "openai/gpt-5.2",
    "openai/gpt-5.2-codex",
    "openai/gpt-5.3-codex",
    "openai/gpt-5.4-mini",
    // ── Anthropic models ──────────────────────────────────────
    "anthropic/claude-haiku-4-5",
    // ── Google models ─────────────────────────────────────────
    "google/gemini-2.5-pro",
    "google/gemini-3-flash",
    "google/gemini-3.1-pro",
    // ── xAI models ────────────────────────────────────────────
    "xai/grok-3",
    "xai/grok-3-mini",
    "xai/grok-code-fast-1",
    // ── DeepSeek models ───────────────────────────────────────
    "deepseek/deepseek-v3-0324",
    "deepseek/deepseek-r1",
    // ── Other models ──────────────────────────────────────────
    "raptor-mini-preview"
  ],
  baseUrl: "https://models.github.ai/inference",
  isFree: true,
  description: "Free access via GitHub token. Includes Claude Haiku 4.5, GPT-4o, Gemini, Grok, DeepSeek & more.",
  signupUrl: "https://github.com/marketplace/models"
}

async function call(
  apiKey: string,
  prompt: string,
  imageBase64: string | null,
  model: string,
  systemPrompt: string
): Promise<ProviderResponse> {
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
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, messages, max_tokens: 8192 })
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      if (res.status === 401) return { text: "", providerId: "github", model, error: `Invalid API key for ${config.name}. Please check your key in Settings.` }
      if (res.status === 429) return { text: "", providerId: "github", model, error: `Rate limit reached for ${config.name}. The app will try the next provider.` }
      return { text: "", providerId: "github", model, error: `API error ${res.status}: ${errText}` }
    }

    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ""
    return { text, providerId: "github", model }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { text: "", providerId: "github", model, error: `Network error: could not reach ${config.name}. ${msg}` }
  }
}

export const githubAdapter: FullProviderAdapter = { config, call }
