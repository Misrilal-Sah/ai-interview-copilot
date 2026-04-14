// src/providers/types.ts — Type definitions for the multi-provider AI system

export interface ProviderConfig {
  id: string
  name: string
  /** true = always supports vision; false = never; function = per-model check */
  supportsVision: boolean | ((model: string) => boolean)
  defaultModel: string
  /** Hardcoded list of model IDs, or "freetext" when the user types the model manually */
  models: string[] | "freetext"
  baseUrl: string
  isFree: boolean
  requiresAccountId?: boolean
  description: string
  signupUrl: string
}

export interface MessageContent {
  type: "text" | "image"
  text?: string
  imageBase64?: string
}

export interface ProviderMessage {
  role: "user" | "assistant" | "system"
  content: string | MessageContent[]
}

export interface ProviderRequest {
  messages: ProviderMessage[]
  model: string
  maxTokens: number
  systemPrompt?: string
}

export interface ProviderResponse {
  text: string
  providerId: string
  model: string
  error?: string
}

export interface FullProviderAdapter {
  config: ProviderConfig
  /**
   * Call the provider with a prompt and optional screenshot image.
   * @param apiKey       The user's API key
   * @param prompt       The full prompt text
   * @param imageBase64  Base64-encoded PNG or null for text-only requests
   * @param model        The model ID to use
   * @param systemPrompt Optional system prompt prepended to the conversation
   * @param accountId    Required only for Cloudflare Workers AI
   */
  call(
    apiKey: string,
    prompt: string,
    imageBase64: string | null,
    model: string,
    systemPrompt: string,
    accountId?: string
  ): Promise<ProviderResponse>
}
