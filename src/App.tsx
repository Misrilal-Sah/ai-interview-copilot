import SubscribedApp from "./_pages/SubscribedApp"
import { UpdateNotification } from "./components/UpdateNotification"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState, useCallback, useRef } from "react"
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from "./components/ui/toast"
import { ToastContext } from "./contexts/toast"
import { SettingsDialog } from "./components/Settings/SettingsDialog"
import { Onboarding } from "./components/Onboarding/Onboarding"
import { useProviderManager } from "./providers/useProviderManager"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: { retry: 1 }
  }
})

function App() {
  const [toastState, setToastState] = useState({
    open: false,
    title: "",
    description: "",
    variant: "neutral" as "neutral" | "success" | "error"
  })
  const [credits] = useState<number>(999)
  const [currentLanguage, setCurrentLanguage] = useState<string>("python")
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Onboarding state — checked from the store
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Provider manager (loads provider order, key status, active providers)
  const {
    providerStates,
    activeVisionProvider,
    activeTextProvider,
    refreshKeyStatus,
    setModelForProvider,
    reorderProviders
  } = useProviderManager()

  // ── Hover-based click-through ────────────────────────────────────────────
  // When the mouse is over a transparent / background area → forward clicks to
  // whatever is behind the Electron window (Chrome, desktop, etc.).
  // When the mouse is over real visible UI content → capture events normally.
  const ignoreRef = useRef<boolean>(true)
  useEffect(() => {
    // Walk up the DOM from el to check if any ancestor has a non-transparent background
    // or is an interactive element. If nothing visible is found, we’re over glass.
    const isOverVisibleUI = (el: Element | null): boolean => {
      if (!el || el === document.body || el === document.documentElement) return false
      const tag = el.tagName.toLowerCase()
      // Interactive elements always capture
      if (['button', 'input', 'select', 'textarea', 'a'].includes(tag)) return true
      // Check computed background
      const bg = window.getComputedStyle(el).backgroundColor
      const isOpaque = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent'
      if (isOpaque) return true
      // Walk up
      return isOverVisibleUI(el.parentElement)
    }

    const onMouseMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const shouldIgnore = !isOverVisibleUI(el)
      if (shouldIgnore !== ignoreRef.current) {
        ignoreRef.current = shouldIgnore
        // @ts-ignore — setIgnoreMouseEvents is injected via preload
        window.electronAPI?.setIgnoreMouseEvents?.(shouldIgnore, { forward: true })
      }
    }
    document.addEventListener('mousemove', onMouseMove)
    // Default: pass clicks through until mouse moves over UI
    window.electronAPI?.setIgnoreMouseEvents?.(true, { forward: true })
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [])

  // Show toast
  const showToast = useCallback(
    (title: string, description: string, variant: "neutral" | "success" | "error") => {
      setToastState({ open: true, title, description, variant })
    },
    []
  )

  const updateLanguage = useCallback((newLanguage: string) => {
    setCurrentLanguage(newLanguage)
    window.__LANGUAGE__ = newLanguage
  }, [])

  const markInitialized = useCallback(() => {
    setIsInitialized(true)
    window.__IS_INITIALIZED__ = true
  }, [])

  // Initialize app: load config + check onboarding status
  useEffect(() => {
    const initializeApp = async () => {
      try {
        window.__CREDITS__ = 999

        // In development always show onboarding so it can be tested
        // In production respect the stored setting
        const isDev = process.env.NODE_ENV === "development"
        let completed = false
        if (!isDev) {
          try {
            completed = (await window.electronAPI.getStoreValue("onboardingCompleted") as boolean) ?? false
          } catch {
            completed = false
          }
        }
        setOnboardingCompleted(completed)
        setShowOnboarding(!completed)

        // Legacy config for language preference
        try {
          const config = await window.electronAPI.getConfig() as { language?: string } | null
          updateLanguage(config?.language ?? "python")
        } catch {
          updateLanguage("python")
        }

        markInitialized()
      } catch (error) {
        console.error("Failed to initialize app:", error)
        updateLanguage("python")
        markInitialized()
      }
    }

    initializeApp()

    // Listen for API key invalid (legacy)
    const onApiKeyInvalid = () => {
      showToast("No AI Provider", "Please add an API key in Settings.", "error")
      setIsSettingsOpen(true)
    }
    const cleanupApiKeyInvalid = window.electronAPI.onApiKeyInvalid(onApiKeyInvalid)

    const unsubscribeSolutionSuccess = window.electronAPI.onSolutionSuccess(() => {
      console.log("Solution complete")
    })

    return () => {
      cleanupApiKeyInvalid()
      unsubscribeSolutionSuccess()
      window.__IS_INITIALIZED__ = false
      setIsInitialized(false)
    }
  }, [updateLanguage, markInitialized, showToast])

  // Listen for show-settings IPC event
  useEffect(() => {
    const unsub = window.electronAPI.onShowSettings(() => setIsSettingsOpen(true))
    return unsub
  }, [])

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false)
    setOnboardingCompleted(true)
    // Restore the user's configured opacity after onboarding
    window.electronAPI.getConfig()
      .then((cfg: any) => {
        const opacity = cfg?.opacity ?? 0.9
        window.electronAPI?.setIgnoreMouseEvents?.(true, { forward: true })
        // @ts-ignore
        window.electronAPI?.setWindowOpacity?.(opacity)
      })
      .catch(() => {
        // @ts-ignore
        window.electronAPI?.setIgnoreMouseEvents?.(true, { forward: true })
      })
    ignoreRef.current = true
    refreshKeyStatus()
  }, [refreshKeyStatus])

  // Force opacity=1 while onboarding is showing so the backdrop is fully solid
  useEffect(() => {
    if (isInitialized && showOnboarding) {
      // @ts-ignore
      window.electronAPI?.setWindowOpacity?.(1.0)
    }
  }, [isInitialized, showOnboarding])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ToastContext.Provider value={{ showToast }}>
          <div className="relative">
            {/* Onboarding overlays everything */}
            {isInitialized && showOnboarding && (
              <Onboarding onComplete={handleOnboardingComplete} />
            )}

            {/* Main app — always rendered, onboarding overlays on top */}
            {isInitialized ? (
              <SubscribedApp
                credits={credits}
                currentLanguage={currentLanguage}
                setLanguage={updateLanguage}
                activeVisionProvider={activeVisionProvider}
                activeTextProvider={activeTextProvider}
                providerStates={providerStates}
                setModelForProvider={setModelForProvider}
                reorderProviders={reorderProviders}
              />
            ) : (
              // Transparent while loading — never a solid black block
              <div className="flex items-center justify-center" style={{ height: "fit-content", padding: "24px" }}>
                <div className="flex flex-col items-center gap-3 bg-black/60 rounded-xl p-6 backdrop-blur">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                  <p className="text-white/60 text-sm">Initializing AI Screen Assistant…</p>
                </div>
              </div>
            )}

            <UpdateNotification />
          </div>

          {/* Settings Dialog */}
          <SettingsDialog
            open={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            providerStates={providerStates}
            onRefreshKeyStatus={refreshKeyStatus}
          />

          <Toast
            open={toastState.open}
            onOpenChange={(open) => setToastState(prev => ({ ...prev, open }))}
            variant={toastState.variant}
            duration={1500}
          >
            <ToastTitle>{toastState.title}</ToastTitle>
            <ToastDescription>{toastState.description}</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastContext.Provider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App