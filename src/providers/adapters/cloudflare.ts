// src/providers/adapters/cloudflare.ts — Cloudflare Workers AI adapter
import type { FullProviderAdapter, ProviderConfig, ProviderResponse } from "../types"

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct"

const config: ProviderConfig = {
  id: "cloudflare",
  name: "Cloudflare Workers AI",
  supportsVision: (model: string) => model === VISION_MODEL || model.includes("vision"),
  defaultModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  models: [
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    VISION_MODEL,
    "@cf/google/gemma-3-12b-it",
    "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"
  ],
  baseUrl: "https://api.cloudflare.com/client/v4/accounts/",
  isFree: true,
  requiresAccountId: true,
  description: "Free tier via Cloudflare. Requires Account ID + API token.",
  signupUrl: "https://dash.cloudflare.com/"
}

async function call(
  apiKey: string,
  prompt: string,
  imageBase64: string | null,
  model: string,
  systemPrompt: string,
  accountId?: string
): Promise<ProviderResponse> {
  if (!accountId || accountId.trim() === "") {
    return {
      text: "",
      providerId: "cloudflare",
      model,
      error: "Cloudflare requires an Account ID. Please add it in Settings → API Keys."
    }
  }

  const url = `${config.baseUrl}${accountId}/ai/run/${model}`

  const messages: Array<{ role: string; content: string }> = []
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt })
  messages.push({ role: "user", content: prompt })

  const body: Record<string, unknown> = { messages }

  // The Cloudflare vision model takes raw image bytes as an array
  if ((model === VISION_MODEL || model.includes("vision")) && imageBase64) {
    try {
      const binaryStr = atob(imageBase64)
      const bytes = new Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }
      body.image = bytes
    } catch {
      // If conversion fails, proceed without image
    }
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      if (res.status === 401) return { text: "", providerId: "cloudflare", model, error: `Invalid API key for ${config.name}. Please check your key in Settings.` }
      if (res.status === 429) return { text: "", providerId: "cloudflare", model, error: `Rate limit reached for ${config.name}. The app will try the next provider.` }
      return { text: "", providerId: "cloudflare", model, error: `API error ${res.status}: ${errText}` }
    }

    const data = await res.json()
    const text: string = data?.result?.response ?? ""
    return { text, providerId: "cloudflare", model }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { text: "", providerId: "cloudflare", model, error: `Network error: could not reach ${config.name}. ${msg}` }
  }
}

export const cloudflareAdapter: FullProviderAdapter = { config, call }
