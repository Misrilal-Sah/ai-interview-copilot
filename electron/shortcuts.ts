import { globalShortcut, app } from "electron"
import { IShortcutsHelperDeps } from "./main"
import { configHelper } from "./ConfigHelper"
import { appStore } from "./storage"

// Default shortcut map — must match the DEFAULT_SHORTCUTS in SettingsDialog.tsx
const DEFAULT_SHORTCUTS: Record<string, string> = {
  takeScreenshot: "CommandOrControl+H",
  processScreenshots: "CommandOrControl+Enter",
  toggleVisibility: "CommandOrControl+B",
  resetSession: "CommandOrControl+R",
  moveLeft: "CommandOrControl+Left",
  moveRight: "CommandOrControl+Right",
  moveUp: "CommandOrControl+Up",
  moveDown: "CommandOrControl+Down",
  decreaseOpacity: "CommandOrControl+[",
  increaseOpacity: "CommandOrControl+]",
  zoomOut: "CommandOrControl+-",
  zoomIn: "CommandOrControl+=",
  resetZoom: "CommandOrControl+0",
  deleteLastScreenshot: "CommandOrControl+L",
  toggleVoice: "CommandOrControl+Shift+V",
  toggleMode: "CommandOrControl+Shift+G",
  toggleChat: "CommandOrControl+Shift+C",
  quitApp: "CommandOrControl+Q"
}

export class ShortcutsHelper {
  private deps: IShortcutsHelperDeps

  constructor(deps: IShortcutsHelperDeps) {
    this.deps = deps
  }

  /**
   * Load custom shortcuts from store — merges with defaults so any
   * uncustomized shortcuts still use the default accelerators.
   */
  private getShortcuts(): Record<string, string> {
    try {
      const custom = (appStore.get("customShortcuts") as Record<string, string>) ?? {}
      const merged = { ...DEFAULT_SHORTCUTS, ...custom }
      const customCount = Object.keys(custom).length
      if (customCount > 0) {
        console.log(`Loaded ${customCount} custom shortcut(s) from store:`, custom)
      }
      return merged
    } catch (err) {
      console.error("Failed to load custom shortcuts from store:", err)
      return { ...DEFAULT_SHORTCUTS }
    }
  }

  private adjustOpacity(delta: number): void {
    const mainWindow = this.deps.getMainWindow();
    if (!mainWindow) return;
    
    let currentOpacity = mainWindow.getOpacity();
    // Allow full range: 0 (invisible) to 1 (fully opaque)
    let newOpacity = Math.max(0, Math.min(1.0, +(currentOpacity + delta).toFixed(2)));
    console.log(`Adjusting opacity from ${currentOpacity} to ${newOpacity}`);
    
    mainWindow.setOpacity(newOpacity);
    
    try {
      const config = configHelper.loadConfig();
      config.opacity = newOpacity;
      configHelper.saveConfig(config);
    } catch (error) {
      console.error('Error saving opacity to config:', error);
    }
    
    // If opacity > 0 and window is currently hidden, show it
    if (newOpacity > 0.05 && !this.deps.isVisible()) {
      this.deps.toggleMainWindow();
    }
    // If opacity hits 0, mark as hidden
    if (newOpacity <= 0.05) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
  }

  /**
   * Safely register a shortcut — logs a warning if it fails
   * (e.g. if the user set a conflicting or invalid accelerator)
   */
  private safeRegister(accelerator: string, action: string, handler: () => void): void {
    try {
      const ok = globalShortcut.register(accelerator, handler)
      if (!ok) {
        console.warn(`Failed to register shortcut "${accelerator}" for ${action} — may be in use by another app`)
      }
    } catch (err) {
      console.error(`Error registering shortcut "${accelerator}" for ${action}:`, err)
    }
  }

  public registerGlobalShortcuts(): void {
    const s = this.getShortcuts()

    this.safeRegister(s.takeScreenshot, "takeScreenshot", async () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        console.log("Taking screenshot...")
        try {
          const screenshotPath = await this.deps.takeScreenshot()
          const preview = await this.deps.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
        } catch (error) {
          console.error("Error capturing screenshot:", error)
        }
      }
    })

    this.safeRegister(s.processScreenshots, "processScreenshots", async () => {
      await this.deps.processingHelper?.processScreenshots()
    })

    this.safeRegister(s.resetSession, "resetSession", () => {
      console.log("Resetting — canceling requests and clearing queues...")
      this.deps.processingHelper?.cancelOngoingRequests()
      this.deps.clearQueues()
      this.deps.setView("queue")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
      }
    })

    this.safeRegister(s.moveLeft, "moveLeft", () => {
      this.deps.moveWindowLeft()
    })

    this.safeRegister(s.moveRight, "moveRight", () => {
      this.deps.moveWindowRight()
    })

    this.safeRegister(s.moveDown, "moveDown", () => {
      this.deps.moveWindowDown()
    })

    this.safeRegister(s.moveUp, "moveUp", () => {
      this.deps.moveWindowUp()
    })

    this.safeRegister(s.toggleVisibility, "toggleVisibility", () => {
      console.log("Toggling window visibility.")
      this.deps.toggleMainWindow()
    })

    this.safeRegister(s.quitApp, "quitApp", () => {
      console.log("Quitting application.")
      app.quit()
    })

    this.safeRegister(s.decreaseOpacity, "decreaseOpacity", () => {
      this.adjustOpacity(-0.1)
    })

    this.safeRegister(s.increaseOpacity, "increaseOpacity", () => {
      this.adjustOpacity(0.1)
    })

    this.safeRegister(s.zoomOut, "zoomOut", () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        const currentZoom = mainWindow.webContents.getZoomLevel()
        mainWindow.webContents.setZoomLevel(currentZoom - 0.5)
      }
    })

    this.safeRegister(s.resetZoom, "resetZoom", () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.setZoomLevel(0)
      }
    })

    this.safeRegister(s.zoomIn, "zoomIn", () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        const currentZoom = mainWindow.webContents.getZoomLevel()
        mainWindow.webContents.setZoomLevel(currentZoom + 0.5)
      }
    })

    this.safeRegister(s.deleteLastScreenshot, "deleteLastScreenshot", () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send("delete-last-screenshot")
      }
    })

    // ── Feature hotkeys ────────────────────────────────────────────────────

    this.safeRegister(s.toggleVoice, "toggleVoice", () => {
      console.log("Toggling voice input.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("toggle-voice")
      }
    })

    this.safeRegister(s.toggleMode, "toggleMode", () => {
      console.log("Toggling app mode.")
      try {
        const currentMode = appStore.get("appMode") as string
        const newMode = currentMode === "coding" ? "general" : "coding"
        appStore.set("appMode", newMode)
        console.log(`App mode toggled to: ${newMode}`)
        const mainWindow = this.deps.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("mode-changed", newMode)
        }
      } catch (err) {
        console.error("Failed to toggle app mode:", err)
      }
    })

    this.safeRegister(s.toggleChat, "toggleChat", () => {
      console.log("Toggling chat input.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("toggle-chat")
      }
    })

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}
