// ipcHandlers.ts

import { ipcMain, shell, dialog, clipboard } from "electron"
import { randomBytes } from "crypto"
import { IIpcHandlerDeps } from "./main"
import { configHelper } from "./ConfigHelper"
import {
  saveApiKey,
  getApiKey,
  deleteApiKey,
  hasApiKey,
  getAllSavedProviderIds,
  appStore
} from "./storage"

export function initializeIpcHandlers(deps: IIpcHandlerDeps): void {
  console.log("Initializing IPC handlers")

  // Configuration handlers
  ipcMain.handle("get-config", () => {
    return configHelper.loadConfig();
  })

  ipcMain.handle("update-config", (_event, updates) => {
    return configHelper.updateConfig(updates);
  })

  ipcMain.handle("check-api-key", () => {
    return configHelper.hasApiKey();
  })

  // Native clipboard write — used by all copy buttons (avoids DOM textarea flicker)
  ipcMain.handle("write-clipboard", (_event, text: string) => {
    try {
      clipboard.writeText(String(text))
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Credits handlers
  ipcMain.handle("set-initial-credits", async (_event, credits: number) => {
    const mainWindow = deps.getMainWindow()
    if (!mainWindow) return

    try {
      // Set the credits in a way that ensures atomicity
      await mainWindow.webContents.executeJavaScript(
        `window.__CREDITS__ = ${credits}`
      )
      mainWindow.webContents.send("credits-updated", credits)
    } catch (error) {
      console.error("Error setting initial credits:", error)
      throw error
    }
  })

  ipcMain.handle("decrement-credits", async () => {
    const mainWindow = deps.getMainWindow()
    if (!mainWindow) return

    try {
      const currentCredits = await mainWindow.webContents.executeJavaScript(
        "window.__CREDITS__"
      )
      if (currentCredits > 0) {
        const newCredits = currentCredits - 1
        await mainWindow.webContents.executeJavaScript(
          `window.__CREDITS__ = ${newCredits}`
        )
        mainWindow.webContents.send("credits-updated", newCredits)
      }
    } catch (error) {
      console.error("Error decrementing credits:", error)
    }
  })

  // Screenshot queue handlers
  ipcMain.handle("get-screenshot-queue", () => {
    return deps.getScreenshotQueue()
  })

  ipcMain.handle("get-extra-screenshot-queue", () => {
    return deps.getExtraScreenshotQueue()
  })

  ipcMain.handle("delete-screenshot", async (event, path: string) => {
    return deps.deleteScreenshot(path)
  })

  ipcMain.handle("get-image-preview", async (event, path: string) => {
    return deps.getImagePreview(path)
  })

  // Screenshot processing handlers
  ipcMain.handle("process-screenshots", async () => {
    // Check for API key before processing — check both old config AND new provider storage
    const hasLegacyKey = configHelper.hasApiKey();
    const hasNewProviderKey = getAllSavedProviderIds().length > 0;
    if (!hasLegacyKey && !hasNewProviderKey) {
      const mainWindow = deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send(deps.PROCESSING_EVENTS.API_KEY_INVALID);
      }
      return;
    }
    
    await deps.processingHelper?.processScreenshots()
  })

  // Window dimension handlers
  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        deps.setWindowDimensions(width, height)
      }
    }
  )

  ipcMain.handle(
    "set-window-dimensions",
    (event, width: number, height: number) => {
      deps.setWindowDimensions(width, height)
    }
  )

  // Screenshot management handlers
  ipcMain.handle("get-screenshots", async () => {
    try {
      let previews = []
      const currentView = deps.getView()

      if (currentView === "queue") {
        const queue = deps.getScreenshotQueue()
        previews = await Promise.all(
          queue.map(async (path) => ({
            path,
            preview: await deps.getImagePreview(path)
          }))
        )
      } else {
        const extraQueue = deps.getExtraScreenshotQueue()
        previews = await Promise.all(
          extraQueue.map(async (path) => ({
            path,
            preview: await deps.getImagePreview(path)
          }))
        )
      }

      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      throw error
    }
  })

  // Screenshot trigger handlers
  ipcMain.handle("trigger-screenshot", async () => {
    const mainWindow = deps.getMainWindow()
    if (mainWindow) {
      try {
        const screenshotPath = await deps.takeScreenshot()
        const preview = await deps.getImagePreview(screenshotPath)
        mainWindow.webContents.send("screenshot-taken", {
          path: screenshotPath,
          preview
        })
        return { success: true }
      } catch (error) {
        console.error("Error triggering screenshot:", error)
        return { error: "Failed to trigger screenshot" }
      }
    }
    return { error: "No main window available" }
  })

  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await deps.takeScreenshot()
      const preview = await deps.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error("Error taking screenshot:", error)
      return { error: "Failed to take screenshot" }
    }
  })

  // Auth-related handlers removed

  ipcMain.handle("open-external-url", (event, url: string) => {
    shell.openExternal(url)
  })
  
  // Open external URL handler
  ipcMain.handle("openLink", (event, url: string) => {
    try {
      console.log(`Opening external URL: ${url}`);
      shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error(`Error opening URL ${url}:`, error);
      return { success: false, error: `Failed to open URL: ${error}` };
    }
  })

  // Settings portal handler
  ipcMain.handle("open-settings-portal", () => {
    const mainWindow = deps.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send("show-settings-dialog");
      return { success: true };
    }
    return { success: false, error: "Main window not available" };
  })

  // Window management handlers
  ipcMain.handle("toggle-window", () => {
    try {
      deps.toggleMainWindow()
      return { success: true }
    } catch (error) {
      console.error("Error toggling window:", error)
      return { error: "Failed to toggle window" }
    }
  })

  ipcMain.handle("reset-queues", async () => {
    try {
      deps.clearQueues()
      return { success: true }
    } catch (error) {
      console.error("Error resetting queues:", error)
      return { error: "Failed to reset queues" }
    }
  })

  // Process screenshot handlers
  ipcMain.handle("trigger-process-screenshots", async () => {
    try {
      // Check for API key before processing — check both old config AND new provider storage
      const hasLegacyKey = configHelper.hasApiKey();
      const hasNewProviderKey = getAllSavedProviderIds().length > 0;
      if (!hasLegacyKey && !hasNewProviderKey) {
        const mainWindow = deps.getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send(deps.PROCESSING_EVENTS.API_KEY_INVALID);
        }
        return { success: false, error: "API key required" };
      }
      
      await deps.processingHelper?.processScreenshots()
      return { success: true }
    } catch (error) {
      console.error("Error processing screenshots:", error)
      return { error: "Failed to process screenshots" }
    }
  })

  // Reset handlers
  ipcMain.handle("trigger-reset", () => {
    try {
      // First cancel any ongoing requests
      deps.processingHelper?.cancelOngoingRequests()

      // Clear all queues immediately
      deps.clearQueues()

      // Reset view to queue
      deps.setView("queue")

      // Get main window and send reset events
      const mainWindow = deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Send reset events in sequence
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
      }

      return { success: true }
    } catch (error) {
      console.error("Error triggering reset:", error)
      return { error: "Failed to trigger reset" }
    }
  })

  // Window movement handlers
  ipcMain.handle("trigger-move-left", () => {
    try {
      deps.moveWindowLeft()
      return { success: true }
    } catch (error) {
      console.error("Error moving window left:", error)
      return { error: "Failed to move window left" }
    }
  })

  ipcMain.handle("trigger-move-right", () => {
    try {
      deps.moveWindowRight()
      return { success: true }
    } catch (error) {
      console.error("Error moving window right:", error)
      return { error: "Failed to move window right" }
    }
  })

  ipcMain.handle("trigger-move-up", () => {
    try {
      deps.moveWindowUp()
      return { success: true }
    } catch (error) {
      console.error("Error moving window up:", error)
      return { error: "Failed to move window up" }
    }
  })

  ipcMain.handle("trigger-move-down", () => {
    try {
      deps.moveWindowDown()
      return { success: true }
    } catch (error) {
      console.error("Error moving window down:", error)
      return { error: "Failed to move window down" }
    }
  })
  
  // Delete last screenshot handler
  ipcMain.handle("delete-last-screenshot", async () => {
    try {
      const queue = deps.getView() === "queue" 
        ? deps.getScreenshotQueue() 
        : deps.getExtraScreenshotQueue()
      
      if (queue.length === 0) {
        return { success: false, error: "No screenshots to delete" }
      }
      
      // Get the last screenshot in the queue
      const lastScreenshot = queue[queue.length - 1]
      
      // Delete it
      const result = await deps.deleteScreenshot(lastScreenshot)
      
      // Notify the renderer about the change
      const mainWindow = deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("screenshot-deleted", { path: lastScreenshot })
      }
      
      return result
    } catch (error) {
      console.error("Error deleting last screenshot:", error)
      return { success: false, error: "Failed to delete last screenshot" }
    }
  })

  // ── Storage IPC Handlers (Step 3b) ──────────────────────────────────────────

  ipcMain.handle("storage:saveKey", (_event, providerId: string, apiKey: string) => {
    return saveApiKey(providerId, apiKey)
  })

  ipcMain.handle("storage:getKey", (_event, providerId: string) => {
    return getApiKey(providerId)
  })

  ipcMain.handle("storage:deleteKey", (_event, providerId: string) => {
    return deleteApiKey(providerId)
  })

  ipcMain.handle("storage:hasKey", (_event, providerId: string) => {
    return hasApiKey(providerId)
  })

  ipcMain.handle("storage:getAllSavedProviders", () => {
    return getAllSavedProviderIds()
  })

  ipcMain.handle("storage:getStore", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (appStore as any).store
  })

  ipcMain.handle("storage:setStoreValue", (_event, key: string, value: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(appStore as any).set(key, value)
    return true
  })

  ipcMain.handle("storage:getStoreValue", (_event, key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (appStore as any).get(key)
  })

  // ── Voice Question Handler ───────────────────────────────────────────────────

  ipcMain.handle("process-voice-question", async (_event, transcript: string) => {
    try {
      const result = await deps.processingHelper?.processVoiceQuestion(transcript)
      return result ?? { success: false, error: "Processing helper not initialized" }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      return { success: false, error: msg }
    }
  })

  // Open external links handler (for onboarding provider sign-up links)
  ipcMain.handle("openExternal", (_event, url: string) => {
    try {
      shell.openExternal(url)
      return { success: true }
    } catch (error) {
      console.error("Failed to open external URL:", error)
      return { success: false }
    }
  })

  // ── Chat Question Handler ─────────────────────────────────────────────────────

  ipcMain.handle("process-chat-question", async (_event, message: string, history: Array<{ role: "user" | "assistant"; content: string }>, imageBase64?: string | null) => {
    try {
      const result = await deps.processingHelper?.processChatQuestion(message, history, imageBase64 ?? null)
      return result ?? { success: false, error: "Processing helper not initialized" }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      return { success: false, error: msg }
    }
  })

  // ── Audio Transcription (Voice Input) ────────────────────────────────────────
  // Receives base64 WebM audio from the renderer, transcribes via Groq Whisper
  // (fastest free option). Falls back to other providers that support Whisper.
  ipcMain.handle("transcribe-audio", async (_event, base64Audio: string, mimeType: string) => {
    try {
      const fs = await import("fs")
      const path = await import("path")
      const { app } = await import("electron")
      const https = await import("https")

      // Write audio to temp file
      const ext = mimeType.includes("ogg") ? "ogg" : "webm"
      const tempPath = path.join(app.getPath("temp"), `voice-${Date.now()}.${ext}`)
      const audioBuffer = Buffer.from(base64Audio, "base64")
      fs.writeFileSync(tempPath, audioBuffer)

      // Provider priority for Whisper transcription:
      // Groq — free, ultra-fast Whisper API (primary choice)
      // openrouter — supports audio transcriptions for some models
      // openai — standard Whisper (only if user has key)
      // NOTE: Mistral, Gemini, Cerebras do NOT have Whisper endpoints
      const whisperProviders = ["groq", "openrouter", "openai"]
      let apiKey: string | null = null
      let chosenProvider = ""

      for (const pid of whisperProviders) {
        try {
          const k = getApiKey(pid)
          if (k) { apiKey = k; chosenProvider = pid; break }
        } catch { /* skip */ }
      }

      if (!apiKey) {
        try { fs.unlinkSync(tempPath) } catch { /* ignore */ }
        return {
          success: false,
          error: "No transcription provider available. Add a free Groq API key in Settings (groq.com) to enable voice input."
        }
      }

      console.log(`Transcribing audio via ${chosenProvider}...`)

      // Determine API endpoint and model by provider
      const endpointMap: Record<string, { host: string; path: string; model: string }> = {
        groq:       { host: "api.groq.com",  path: "/openai/v1/audio/transcriptions", model: "whisper-large-v3-turbo" },
        openrouter: { host: "openrouter.ai",  path: "/api/v1/audio/transcriptions",   model: "whisper-1" },
        openai:     { host: "api.openai.com", path: "/v1/audio/transcriptions",        model: "whisper-1" },
      }
      const endpoint = endpointMap[chosenProvider] ?? endpointMap["groq"]

      // Build multipart body
      const fileData = fs.readFileSync(tempPath)
      const boundary = `----FormBoundary${Date.now()}`
      const filename = `audio.${ext}`

      const parts: Buffer[] = []
      const addField = (name: string, value: string) => {
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`))
      }
      addField("model", endpoint.model)
      addField("response_format", "json")
      parts.push(
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType || "audio/webm"}\r\n\r\n`),
        fileData,
        Buffer.from(`\r\n--${boundary}--\r\n`)
      )
      const body = Buffer.concat(parts)

      // Send HTTP request
      const transcript = await new Promise<string>((resolve, reject) => {
        const req = https.request({
          hostname: endpoint.host,
          path: endpoint.path,
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "Content-Length": body.length,
          }
        }, (res) => {
          let data = ""
          res.on("data", (chunk: Buffer) => { data += chunk.toString() })
          res.on("end", () => {
            try {
              const json = JSON.parse(data)
              if (json.text) resolve(json.text.trim())
              else reject(new Error(json.error?.message ?? `HTTP ${res.statusCode}: ${data}`))
            } catch { reject(new Error(data)) }
          })
        })
        req.on("error", reject)
        req.write(body)
        req.end()
      })

      // Cleanup temp file
      try { fs.unlinkSync(tempPath) } catch { /* ignore */ }

      console.log(`Transcription: "${transcript}"`)
      return { success: true, transcript }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Transcription error:", msg)
      return { success: false, error: `Transcription failed: ${msg}` }
    }
  })
}

