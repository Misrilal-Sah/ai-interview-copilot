// storage.ts — Main process only. Handles encrypted API key storage and persistent app preferences.
import { safeStorage, app } from "electron"
import fs from "fs"
import path from "path"
import Store from "electron-store"

// ─── App Store (non-sensitive preferences) ───────────────────────────────────

interface AppStoreSchema {
  providerOrder: string[]
  modelPreferences: Record<string, string>
  appMode: string
  answerLanguage: string
  showProviderUsed: boolean
  autoAnalyzeOnScreenshot: boolean
  codingLanguage: string
  onboardingCompleted: boolean
  customPrompt: string
  windowBounds: { x: number | null; y: number | null; width: number; height: number }
  windowOpacity: number
  cloudflareAccountId: string
}

export const appStore = new Store<AppStoreSchema>({
  name: "app-preferences",
  defaults: {
    providerOrder: ["gemini", "github", "groq", "openrouter", "cerebras", "mistral", "cohere", "cloudflare"],
    modelPreferences: {
      gemini: "gemini-2.0-flash",
      github: "openai/gpt-4o",
      groq: "llama-3.3-70b-versatile",
      openrouter: "",
      cerebras: "llama-3.3-70b",
      mistral: "mistral-small-latest",
      cohere: "command-r-08-2024",
      cloudflare: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    },
    appMode: "general",
    answerLanguage: "auto",
    showProviderUsed: true,
    autoAnalyzeOnScreenshot: false,
    codingLanguage: "python",
    onboardingCompleted: false,
    customPrompt: "",
    windowBounds: { x: null, y: null, width: 380, height: 600 },
    windowOpacity: 1.0,
    cloudflareAccountId: ""
  }
})

// ─── Encrypted API Key Storage ───────────────────────────────────────────────

function getEncKeyPath(providerId: string): string {
  return path.join(app.getPath("userData"), `key_${providerId}.enc`)
}

function getTxtKeyPath(providerId: string): string {
  return path.join(app.getPath("userData"), `key_${providerId}.txt`)
}

/**
 * Save an API key securely. Uses safeStorage encryption when available,
 * falls back to plain text when encryption is not supported (e.g. Linux CI).
 */
export function saveApiKey(providerId: string, apiKey: string): boolean {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(apiKey)
      fs.writeFileSync(getEncKeyPath(providerId), encrypted)
      // Remove plain text fallback if it exists
      const txtPath = getTxtKeyPath(providerId)
      if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath)
    } else {
      // Fallback: store plain text
      fs.writeFileSync(getTxtKeyPath(providerId), apiKey, "utf8")
    }
    return true
  } catch (error) {
    console.error(`Failed to save API key for ${providerId}:`, error)
    return false
  }
}

/**
 * Retrieve a stored API key. Prefers encrypted file, falls back to plain text.
 */
export function getApiKey(providerId: string): string | null {
  try {
    const encPath = getEncKeyPath(providerId)
    if (fs.existsSync(encPath)) {
      const encrypted = fs.readFileSync(encPath)
      return safeStorage.decryptString(encrypted)
    }
    const txtPath = getTxtKeyPath(providerId)
    if (fs.existsSync(txtPath)) {
      return fs.readFileSync(txtPath, "utf8").trim()
    }
    return null
  } catch (error) {
    console.error(`Failed to get API key for ${providerId}:`, error)
    return null
  }
}

/**
 * Delete a stored API key (both enc and txt variants if present).
 */
export function deleteApiKey(providerId: string): boolean {
  try {
    const encPath = getEncKeyPath(providerId)
    const txtPath = getTxtKeyPath(providerId)
    if (fs.existsSync(encPath)) fs.unlinkSync(encPath)
    if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath)
    return true
  } catch (error) {
    console.error(`Failed to delete API key for ${providerId}:`, error)
    return false
  }
}

/**
 * Check whether a key file exists for the given provider.
 */
export function hasApiKey(providerId: string): boolean {
  return fs.existsSync(getEncKeyPath(providerId)) || fs.existsSync(getTxtKeyPath(providerId))
}

/**
 * Return IDs of all providers that have a saved key.
 */
export function getAllSavedProviderIds(): string[] {
  try {
    const userData = app.getPath("userData")
    const files = fs.readdirSync(userData)
    const ids = new Set<string>()
    for (const file of files) {
      const encMatch = file.match(/^key_(.+)\.enc$/)
      const txtMatch = file.match(/^key_(.+)\.txt$/)
      if (encMatch) ids.add(encMatch[1])
      if (txtMatch) ids.add(txtMatch[1])
    }
    return Array.from(ids)
  } catch (error) {
    console.error("Failed to list saved provider IDs:", error)
    return []
  }
}
