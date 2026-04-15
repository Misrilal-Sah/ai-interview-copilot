// src/utils/providerMeta.ts — Per-model capability metadata (separate from adapters)

export type ModelCapability = "vision" | "fast" | "reasoning"

/**
 * Capability flags for every known model.
 * - vision    : can accept image/screenshot input
 * - fast      : optimised for low-latency / high-throughput inference
 * - reasoning : extended chain-of-thought / complex reasoning
 */
export const MODEL_CAPABILITIES: Record<string, ModelCapability[]> = {
  // ── Gemini ──────────────────────────────────────────────────────────────────
  "gemini-2.0-flash":               ["vision", "fast"],
  "gemini-2.0-flash-lite":          ["vision", "fast"],
  "gemini-1.5-flash":               ["vision", "fast"],
  "gemini-1.5-pro":                 ["vision", "reasoning"],
  "gemini-2.5-pro-preview-03-25":   ["vision", "reasoning"],

  // ── Groq ────────────────────────────────────────────────────────────────────
  "llama-3.3-70b-versatile":        ["fast"],
  "llama-3.1-8b-instant":           ["fast"],
  "llama3-70b-8192":                ["fast"],
  "mixtral-8x7b-32768":             ["fast"],
  "gemma2-9b-it":                   ["fast"],
  "deepseek-r1-distill-llama-70b":  ["reasoning"],

  // ── GitHub Models ────────────────────────────────────────────────────────────
  "openai/gpt-4o":                  ["vision", "reasoning"],
  "openai/gpt-4o-mini":             ["vision", "fast"],
  "xai/grok-3":                     ["reasoning"],
  "xai/grok-3-mini":                ["fast", "reasoning"],
  "deepseek/deepseek-v3-0324":      ["reasoning"],
  "deepseek/deepseek-r1":           ["reasoning"],

  // ── Cerebras ────────────────────────────────────────────────────────────────
  "llama-3.3-70b":                  ["fast"],
  "llama3.1-8b":                    ["fast"],
  "llama-4-scout-17b-16e-instruct": ["fast"],

  // ── Mistral ─────────────────────────────────────────────────────────────────
  "mistral-small-latest":           ["fast"],
  "mistral-medium-latest":          [],
  "mistral-large-latest":           ["reasoning"],
  "pixtral-12b-2409":               ["vision", "fast"],
  "pixtral-large-latest":           ["vision", "reasoning"],

  // ── Cohere ──────────────────────────────────────────────────────────────────
  "command-r-plus-08-2024":         ["reasoning"],
  "command-r-08-2024":              ["fast"],
  "command-r7b-12-2024":            ["fast"],

  // ── Cloudflare Workers AI ────────────────────────────────────────────────────
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast":       ["fast"],
  "@cf/meta/llama-3.2-11b-vision-instruct":         ["vision", "fast"],
  "@cf/google/gemma-3-12b-it":                      ["fast"],
  "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b":  ["reasoning"],
}

/** Get capability flags for a given model string (returns [] for unknown models). */
export function getModelCapabilities(model: string): ModelCapability[] {
  return MODEL_CAPABILITIES[model] ?? []
}
