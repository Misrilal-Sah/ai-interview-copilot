/// <reference types="vite/client" />

import { ToastMessage } from "./components/ui/toast"

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly NODE_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ElectronAPI {
  // ── Original methods ──────────────────────────────────────────────────────
  openSubscriptionPortal: (authData: {
    id: string
    email: string
  }) => Promise<{ success: boolean; error?: string }>
  updateContentDimensions: (dimensions: {
    width: number
    height: number
  }) => Promise<void>
  clearStore: () => Promise<{ success: boolean; error?: string }>
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
  deleteScreenshot: (
    path: string
  ) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: unknown) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onProblemExtracted: (callback: (data: unknown) => void) => () => void
  onSolutionSuccess: (callback: (data: unknown) => void) => () => void
  onUnauthorized: (callback: () => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  openExternal: (url: string) => void
  toggleMainWindow: () => Promise<{ success: boolean; error?: string }>
  triggerScreenshot: () => Promise<{ success: boolean; error?: string }>
  triggerProcessScreenshots: () => Promise<{ success: boolean; error?: string }>
  triggerReset: () => Promise<{ success: boolean; error?: string }>
  triggerMoveLeft: () => Promise<{ success: boolean; error?: string }>
  triggerMoveRight: () => Promise<{ success: boolean; error?: string }>
  triggerMoveUp: () => Promise<{ success: boolean; error?: string }>
  triggerMoveDown: () => Promise<{ success: boolean; error?: string }>
  onSubscriptionUpdated: (callback: () => void) => () => void
  onSubscriptionPortalClosed: (callback: () => void) => () => void
  startUpdate: () => Promise<{ success: boolean; error?: string }>
  installUpdate: () => void
  onUpdateAvailable: (callback: (info: unknown) => void) => () => void
  onUpdateDownloaded: (callback: (info: unknown) => void) => () => void
  // Config (legacy)
  getConfig: () => Promise<unknown>
  updateConfig: (config: {
    apiKey?: string
    model?: string
    language?: string
    opacity?: number
    apiProvider?: string
    extractionModel?: string
    solutionModel?: string
    debuggingModel?: string
  }) => Promise<unknown>
  checkApiKey: () => Promise<boolean>
  validateApiKey: (apiKey: string) => Promise<{ valid: boolean; error?: string }>
  onShowSettings: (callback: () => void) => () => void
  onApiKeyInvalid: (callback: () => void) => () => void
  removeListener: (eventName: string, callback: (...args: unknown[]) => void) => void
  onDeleteLastScreenshot: (callback: () => void) => () => void
  deleteLastScreenshot: () => Promise<unknown>
  openLink: (url: string) => void
  openSettingsPortal: () => Promise<unknown>
  getPlatform: () => string
  decrementCredits: () => Promise<unknown>
  onCreditsUpdated: (callback: (credits: number) => void) => () => void
  onReset: (callback: () => void) => () => void

  // ── Storage API (Step 3c) ─────────────────────────────────────────────────
  saveKey: (providerId: string, apiKey: string) => Promise<boolean>
  getKey: (providerId: string) => Promise<string | null>
  deleteKey: (providerId: string) => Promise<boolean>
  hasKey: (providerId: string) => Promise<boolean>
  getAllSavedProviders: () => Promise<string[]>
  getStore: () => Promise<Record<string, unknown>>
  setStoreValue: (key: string, value: unknown) => Promise<boolean>
  getStoreValue: (key: string) => Promise<unknown>

  // ── Voice (Step 8) ────────────────────────────────────────────────────────
  processVoiceQuestion: (transcript: string) => Promise<{
    success: boolean
    text?: string
    providerId?: string
    model?: string
    error?: string
  }>
  onVoiceToggle: (callback: () => void) => () => void
  onModeChanged: (callback: (mode: string) => void) => () => void

  // ── Click-through ─────────────────────────────────────────────────────────
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }) => void

  // ── Voice transcription ────────────────────────────────────────────────────
  transcribeAudio: (base64Audio: string, mimeType: string) => Promise<{ success: boolean; transcript?: string; error?: string }>

  // ── Chat ────────────────────────────────────────────────────────────────────
  processChatQuestion: (message: string, history: Array<{ role: "user" | "assistant"; content: string }>, imageBase64?: string | null) => Promise<{
    success: boolean
    text?: string
    providerId?: string
    model?: string
    error?: string
  }>
  onChatToggle: (callback: () => void) => () => void
  onSendScreenshotToChat: (callback: (data: { path: string; preview: string }) => void) => () => void
}

interface Window {
  electronAPI: ElectronAPI
  electron: {
    ipcRenderer: {
      on(channel: string, func: (...args: unknown[]) => void): void
      removeListener(channel: string, func: (...args: unknown[]) => void): void
    }
  }
  __CREDITS__: number
  __LANGUAGE__: string
  __IS_INITIALIZED__: boolean
  __AUTH_TOKEN__: string
}
