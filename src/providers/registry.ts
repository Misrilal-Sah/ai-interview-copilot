// src/providers/registry.ts — Central registry of all AI provider adapters
import { geminiAdapter } from "./adapters/gemini"
import { groqAdapter } from "./adapters/groq"
import { githubAdapter } from "./adapters/github"
import { openrouterAdapter } from "./adapters/openrouter"
import { cerebrasAdapter } from "./adapters/cerebras"
import { mistralAdapter } from "./adapters/mistral"
import { cohereAdapter } from "./adapters/cohere"
import { cloudflareAdapter } from "./adapters/cloudflare"
import type { FullProviderAdapter } from "./types"

export const PROVIDER_REGISTRY: Record<string, FullProviderAdapter> = {
  gemini: geminiAdapter,
  groq: groqAdapter,
  github: githubAdapter,
  openrouter: openrouterAdapter,
  cerebras: cerebrasAdapter,
  mistral: mistralAdapter,
  cohere: cohereAdapter,
  cloudflare: cloudflareAdapter
}

export const DEFAULT_PROVIDER_ORDER: string[] = [
  "gemini",
  "github",
  "groq",
  "openrouter",
  "cerebras",
  "mistral",
  "cohere",
  "cloudflare"
]

/** Get a single adapter by provider ID. Returns null if not found. */
export function getProvider(id: string): FullProviderAdapter | null {
  return PROVIDER_REGISTRY[id] ?? null
}

/** Get all adapters as an array in default order. */
export function getAllProviders(): FullProviderAdapter[] {
  return DEFAULT_PROVIDER_ORDER.map(id => PROVIDER_REGISTRY[id]).filter(Boolean)
}

/**
 * A provider "supports vision" if:
 * - supportsVision is true, OR
 * - supportsVision is a function that returns true for any vision-y model name
 */
export function adapterSupportsVision(adapter: FullProviderAdapter, model?: string): boolean {
  const sv = adapter.config.supportsVision
  if (typeof sv === "boolean") return sv
  // Use the given model, otherwise test with a representative vision model name
  return sv(model ?? adapter.config.defaultModel)
}

/** Get all adapters that support vision for at least their default model. */
export function getVisionProviders(): FullProviderAdapter[] {
  return getAllProviders().filter(a => adapterSupportsVision(a))
}

/** Return adapters sorted by the given priority order array. */
export function getProvidersSortedByOrder(order: string[]): FullProviderAdapter[] {
  const result: FullProviderAdapter[] = []
  for (const id of order) {
    const adapter = PROVIDER_REGISTRY[id]
    if (adapter) result.push(adapter)
  }
  // Append any providers not in the order array at the end
  for (const id of DEFAULT_PROVIDER_ORDER) {
    if (!order.includes(id) && PROVIDER_REGISTRY[id]) {
      result.push(PROVIDER_REGISTRY[id])
    }
  }
  return result
}
