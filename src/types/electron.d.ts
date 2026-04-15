export interface ElectronAPI {
  // Window & navigation
  openSubscriptionPortal: (authData: { id: string; email: string }) => Promise<{ success: boolean; error?: string }>
  openSettingsPortal: () => Promise<void>
  updateContentDimensions: (dimensions: { width: number; height: number }) => Promise<void>
  clearStore: () => Promise<{ success: boolean; error?: string }>
  toggleMainWindow: () => Promise<{ success: boolean; error?: string }>
  getPlatform: () => string
  openLink: (url: string) => void
  openExternal: (url: string) => Promise<void>

  // Screenshots
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>
  deleteLastScreenshot: () => Promise<{ success: boolean; error?: string }>
  triggerScreenshot: () => Promise<{ success: boolean; error?: string }>
  triggerProcessScreenshots: () => Promise<{ success: boolean; error?: string }>
  triggerReset: () => Promise<{ success: boolean; error?: string }>
  triggerMoveLeft: () => Promise<{ success: boolean; error?: string }>
  triggerMoveRight: () => Promise<{ success: boolean; error?: string }>
  triggerMoveUp: () => Promise<{ success: boolean; error?: string }>
  triggerMoveDown: () => Promise<{ success: boolean; error?: string }>

  // Config (legacy — language + opacity)
  getConfig: () => Promise<{ apiKey?: string; apiProvider?: string; language?: string; opacity?: number }>
  updateConfig: (config: { apiKey?: string; model?: string; language?: string; opacity?: number }) => Promise<{ language?: string; opacity?: number }>
  checkApiKey: () => Promise<boolean>

  // Events — solutions
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onSolutionSuccess: (callback: (data: any) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProblemExtracted: (callback: (data: any) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: any) => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  onApiKeyInvalid: (callback: () => void) => () => void
  onUnauthorized: (callback: () => void) => () => void
  onDeleteLastScreenshot: (callback: () => void) => () => void
  onShowSettings: (callback: () => void) => () => void
  onReset: (callback: () => void) => () => void

  // Events — credits / subscription
  decrementCredits: () => Promise<void>
  onCreditsUpdated: (callback: (credits: number) => void) => () => void
  onOutOfCredits: (callback: () => void) => () => void
  onSubscriptionUpdated: (callback: () => void) => () => void
  onSubscriptionPortalClosed: (callback: () => void) => () => void

  // Events — updates
  startUpdate: () => Promise<{ success: boolean; error?: string }>
  installUpdate: () => void
  onUpdateAvailable: (callback: (info: any) => void) => () => void
  onUpdateDownloaded: (callback: (info: any) => void) => () => void

  // Storage (provider key management)
  saveKey: (providerId: string, apiKey: string) => Promise<{ success: boolean; error?: string }>
  getKey: (providerId: string) => Promise<string | null>
  deleteKey: (providerId: string) => Promise<{ success: boolean }>
  hasKey: (providerId: string) => Promise<boolean>
  getAllSavedProviders: () => Promise<string[]>
  getStore: () => Promise<Record<string, unknown>>
  setStoreValue: (key: string, value: unknown) => Promise<void>
  getStoreValue: (key: string) => Promise<unknown>

  // Voice
  processVoiceQuestion: (transcript: string) => Promise<{ success: boolean; text?: string; providerId?: string; model?: string; error?: string }>
  transcribeAudio: (base64Audio: string, mimeType: string) => Promise<{ success: boolean; transcript?: string; error?: string }>
  onVoiceToggle: (callback: () => void) => () => void
  onModeChanged: (callback: (mode: string) => void) => () => void

  // Chat (text chatbot)
  processChatQuestion: (message: string, history: Array<{ role: "user" | "assistant"; content: string }>) => Promise<{ success: boolean; text?: string; providerId?: string; model?: string; error?: string }>
  onChatToggle: (callback: () => void) => () => void

  // Click-through control
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }) => void

  // Window opacity
  setWindowOpacity: (opacity: number) => Promise<void>

  // Native clipboard (no DOM flicker)
  writeClipboard: (text: string) => Promise<{ success: boolean; error?: string }>

  // Misc
  removeListener: (eventName: string, callback: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: any[]) => void) => void
        removeListener: (channel: string, func: (...args: any[]) => void) => void
      }
    }
    __CREDITS__: number
    __LANGUAGE__: string
    __IS_INITIALIZED__: boolean
    __AUTH_TOKEN__?: string | null
  }
}
