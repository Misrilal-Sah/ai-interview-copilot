// src/_pages/SubscribedApp.tsx — Main overlay: status bar, voice input, chat, history panel
import React, { useEffect, useRef, useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import Queue from "./Queue"
import Solutions from "./Solutions"
import { useToast } from "../contexts/toast"
import { VoiceInput } from "../components/VoiceInput/VoiceInput"
import { ChatInput } from "../components/ChatInput/ChatInput"
import { AnswerHistory, type HistoryEntry } from "../components/History/AnswerHistory"
import { History, Code2, Brain, MessageCircle, ChevronDown } from "lucide-react"
import type { ProviderState } from "../providers/useProviderManager"
import { adapterSupportsVision } from "../providers/registry"
import { ProviderLogo } from "../components/shared/ProviderLogo"
import { getModelCapabilities } from "../utils/providerMeta"

interface SubscribedAppProps {
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
  activeVisionProvider?: ProviderState | null
  activeTextProvider?: ProviderState | null
  providerStates?: ProviderState[]
  setModelForProvider?: (providerId: string, model: string) => void
  reorderProviders?: (newOrder: string[]) => Promise<void>
}

// ── Capability badge component ────────────────────────────────────────────────
const CapBadges: React.FC<{ model: string; isVisionProvider: boolean }> = ({ model, isVisionProvider }) => {
  const caps = getModelCapabilities(model)
  // Also check adapter at runtime for vision
  const hasVision = caps.includes("vision") || isVisionProvider
  const hasFast = caps.includes("fast")
  const hasReasoning = caps.includes("reasoning")
  return (
    <span className="flex items-center gap-0.5 ml-1 flex-shrink-0">
      {hasVision    && <span title="Vision — accepts screenshots/images" className="text-[9px] text-blue-400">👁</span>}
      {hasFast      && <span title="Fast inference"                       className="text-[9px] text-yellow-400">⚡</span>}
      {hasReasoning && <span title="Advanced reasoning"                   className="text-[9px] text-purple-400">🧠</span>}
    </span>
  )
}

// ── Custom dropdown hook ──────────────────────────────────────────────────────
function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])
  return { open, setOpen, ref }
}

const SubscribedApp: React.FC<SubscribedAppProps> = ({
  credits,
  currentLanguage,
  setLanguage,
  activeVisionProvider,
  activeTextProvider,
  providerStates = [],
  setModelForProvider,
  reorderProviders
}) => {
  const queryClient = useQueryClient()
  const [view, setView] = useState<"queue" | "solutions" | "debug">("queue")
  const containerRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  // App mode (general / coding) — kept in sync with the store
  const [appMode, setAppMode] = useState<"general" | "coding">("general")

  // History panel state
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Voice answer display
  const [voiceAnswerText, setVoiceAnswerText] = useState<string | null>(null)
  const [voiceAnswerMeta, setVoiceAnswerMeta] = useState<{ providerId: string; model: string } | null>(null)
  const [voiceLoading, setVoiceLoading] = useState(false)

  // Chat panel state
  const [showChat, setShowChat] = useState(false)

  // Custom dropdown state
  const providerDd = useDropdown()
  const modelDd = useDropdown()

  // Load app mode from store on mount
  useEffect(() => {
    window.electronAPI.getStoreValue("appMode")
      .then((mode: unknown) => setAppMode(((mode as string) ?? "general") as "general" | "coding"))
      .catch(() => setAppMode("general"))
  }, [])

  // Listen for mode changes from hotkey (Ctrl+Shift+G)
  useEffect(() => {
    const unsub = window.electronAPI.onModeChanged((mode: string) => {
      setAppMode(mode as "general" | "coding")
      showToast(
        `Mode: ${mode === "coding" ? "Coding" : "General"}`,
        mode === "coding" ? "Optimized for coding problems" : "Answers any on-screen content",
        "neutral"
      )
    })
    return unsub
  }, [showToast])

  // Listen for chat toggle hotkey (Ctrl+Shift+C)
  useEffect(() => {
    const unsub = window.electronAPI.onChatToggle(() => {
      setShowChat(prev => !prev)
    })
    return unsub
  }, [])

  // Handle voice transcript → AI answer
  const handleVoiceTranscript = useCallback(async (transcript: string) => {
    setVoiceLoading(true)
    setVoiceAnswerText(null)
    setVoiceAnswerMeta(null)
    setView("queue")

    try {
      const result = await window.electronAPI.processVoiceQuestion(transcript)
      if (result.success && result.text) {
        setVoiceAnswerText(result.text)
        setVoiceAnswerMeta({ providerId: result.providerId ?? "", model: result.model ?? "" })

        const entry: HistoryEntry = {
          id: `${Date.now()}-voice`,
          timestamp: new Date(),
          source: "voice",
          question: transcript,
          answer: result.text,
          providerId: result.providerId ?? "",
          model: result.model ?? "",
          screenshotThumb: null
        }
        setHistoryEntries(prev => [entry, ...prev].slice(0, 20))
      } else {
        showToast("Voice Error", result.error ?? "Unknown error", "error")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast("Voice Error", msg, "error")
    } finally {
      setVoiceLoading(false)
    }
  }, [showToast])

  // Reset view listener
  useEffect(() => {
    const cleanup = window.electronAPI.onResetView(() => {
      queryClient.invalidateQueries({ queryKey: ["screenshots"] })
      queryClient.invalidateQueries({ queryKey: ["problem_statement"] })
      queryClient.invalidateQueries({ queryKey: ["solution"] })
      queryClient.invalidateQueries({ queryKey: ["new_solution"] })
      setView("queue")
      setVoiceAnswerText(null)
    })
    return cleanup
  }, [queryClient])

  // Dimension sync with debounce
  useEffect(() => {
    if (!containerRef.current) return
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const updateDimensions = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (!containerRef.current) return
        const maxH = Math.floor(window.screen.height * 0.85)
        const height = Math.min(containerRef.current.scrollHeight || 600, maxH)
        const width = containerRef.current.scrollWidth || 800
        window.electronAPI?.updateContentDimensions({ width, height })
      }, 80)
    }
    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)
    const mutationObserver = new MutationObserver(updateDimensions)
    mutationObserver.observe(containerRef.current, {
      childList: true, subtree: true, attributes: false, characterData: false
    })
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [view])

  // Solution/error event listeners
  useEffect(() => {
    const cleanups = [
      window.electronAPI.onSolutionStart(() => setView("solutions")),
      window.electronAPI.onUnauthorized(() => {
        queryClient.removeQueries({ queryKey: ["screenshots"] })
        queryClient.removeQueries({ queryKey: ["solution"] })
        queryClient.removeQueries({ queryKey: ["problem_statement"] })
        setView("queue")
      }),
      window.electronAPI.onResetView(() => {
        queryClient.removeQueries({ queryKey: ["screenshots"] })
        queryClient.removeQueries({ queryKey: ["solution"] })
        queryClient.removeQueries({ queryKey: ["problem_statement"] })
        queryClient.setQueryData(["problem_statement"], null)
        setView("queue")
      }),
      window.electronAPI.onProblemExtracted((data: unknown) => {
        if (view === "queue") {
          queryClient.invalidateQueries({ queryKey: ["problem_statement"] })
          queryClient.setQueryData(["problem_statement"], data)
        }
      }),
      window.electronAPI.onSolutionError((error: string) => {
        showToast("Error", error, "error")
      })
    ]
    return () => cleanups.forEach(fn => fn())
  }, [view, queryClient, showToast])

  // ── Derived top-bar info ──────────────────────────────────────────────────
  const activeProvider = activeVisionProvider ?? activeTextProvider
  const providerDot = activeProvider
    ? (activeProvider.keySaved ? "bg-green-400" : "bg-yellow-400")
    : "bg-red-400"
  const savedProviders = providerStates.filter(ps => ps.keySaved)

  // Provider change handler: promote to top of order + update model
  const handleProviderChange = (newId: string) => {
    providerDd.setOpen(false)
    if (reorderProviders) {
      const currentOrder = providerStates.map(ps => ps.adapter.config.id)
      const newOrder = [newId, ...currentOrder.filter(id => id !== newId)]
      reorderProviders(newOrder)
    }
    // keep the provider's saved model preference (no override needed — it's in state)
  }

  // Model change handler
  const handleModelChange = (model: string) => {
    modelDd.setOpen(false)
    if (activeProvider && setModelForProvider) {
      setModelForProvider(activeProvider.adapter.config.id, model)
    }
  }

  const models = activeProvider
    ? (activeProvider.adapter.config.models === "freetext"
        ? [activeProvider.selectedModel]
        : (activeProvider.adapter.config.models as string[]))
    : []

  return (
    <div ref={containerRef} className="min-h-0 flex flex-col">
      {/* ── Status Bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/40 flex-shrink-0">

        {/* Left: provider/model selector + drag handle */}
        <div
          className="flex items-center gap-2 min-w-0 flex-1"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${providerDot}`} />

          <div
            className="flex items-center gap-1 min-w-0"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            {/* ── Provider dropdown ── */}
            <div ref={providerDd.ref} className="relative">
              <button
                onClick={() => { providerDd.setOpen(o => !o); modelDd.setOpen(false) }}
                className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-white/10 transition-colors"
                title="Switch AI provider"
              >
                {activeProvider && (
                  <ProviderLogo providerId={activeProvider.adapter.config.id} size={14} />
                )}
                <span className="text-white/60 text-xs truncate max-w-[80px]">
                  {activeProvider?.adapter.config.name ?? "No provider"}
                </span>
                <ChevronDown className={`w-3 h-3 text-white/40 flex-shrink-0 transition-transform ${providerDd.open ? "rotate-180" : ""}`} />
              </button>

              {providerDd.open && savedProviders.length > 0 && (
                <div
                  className="absolute top-full left-0 mt-1 min-w-[190px] bg-gray-950 border border-white/10 rounded-lg shadow-2xl overflow-hidden"
                  style={{ zIndex: 9999 }}
                >
                  {savedProviders.map(ps => {
                    const isActive = ps.adapter.config.id === activeProvider?.adapter.config.id
                    const hasVision = adapterSupportsVision(ps.adapter, ps.selectedModel)
                    return (
                      <button
                        key={ps.adapter.config.id}
                        onClick={() => handleProviderChange(ps.adapter.config.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/5 transition-colors ${isActive ? "bg-white/10 text-white" : "text-white/70"}`}
                      >
                        <ProviderLogo providerId={ps.adapter.config.id} size={14} />
                        <span className="flex-1 truncate">{ps.adapter.config.name}</span>
                        {hasVision && <span title="Vision" className="text-[9px] text-blue-400">👁</span>}
                        {ps.adapter.config.isFree && <span className="text-[9px] text-green-500 border border-green-600/30 px-1 rounded">FREE</span>}
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <span className="text-white/20 text-xs">·</span>

            {/* ── Model dropdown ── */}
            <div ref={modelDd.ref} className="relative">
              <button
                onClick={() => { modelDd.setOpen(o => !o); providerDd.setOpen(false) }}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10 transition-colors"
                title="Switch model"
              >
                <span className="text-white/40 text-xs truncate max-w-[100px]">
                  {activeProvider?.selectedModel
                    ? activeProvider.selectedModel.split("/").pop()?.split("-").slice(0, 3).join("-") ?? activeProvider.selectedModel
                    : "—"}
                </span>
                {activeProvider && (
                  <CapBadges
                    model={activeProvider.selectedModel}
                    isVisionProvider={adapterSupportsVision(activeProvider.adapter, activeProvider.selectedModel)}
                  />
                )}
                <ChevronDown className={`w-3 h-3 text-white/30 flex-shrink-0 transition-transform ${modelDd.open ? "rotate-180" : ""}`} />
              </button>

              {modelDd.open && models.length > 0 && (
                <div
                  className="absolute top-full left-0 mt-1 min-w-[220px] bg-gray-950 border border-white/10 rounded-lg shadow-2xl overflow-hidden"
                  style={{ zIndex: 9999 }}
                >
                  {models.map(m => {
                    const isActive = m === activeProvider?.selectedModel
                    const caps = getModelCapabilities(m)
                    const modelHasVision = caps.includes("vision") ||
                      (activeProvider ? adapterSupportsVision(activeProvider.adapter, m) : false)
                    const displayName = m.split("/").pop() ?? m
                    return (
                      <button
                        key={m}
                        onClick={() => handleModelChange(m)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/5 transition-colors ${isActive ? "bg-white/10 text-white" : "text-white/70"}`}
                      >
                        <span className="flex-1 truncate font-mono">{displayName}</span>
                        <span className="flex items-center gap-0.5 flex-shrink-0">
                          {modelHasVision         && <span title="Vision"    className="text-[9px] text-blue-400"  >👁</span>}
                          {caps.includes("fast")   && <span title="Fast"      className="text-[9px] text-yellow-400">⚡</span>}
                          {caps.includes("reasoning") && <span title="Reasoning" className="text-[9px] text-purple-400">🧠</span>}
                        </span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Grip dots — visual drag hint */}
          <span
            className="text-white/20 text-xs ml-auto mr-2 select-none"
            style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
          >⠿</span>
        </div>

        {/* Right: mode badge + voice + chat + history — NOT draggable */}
        <div
          className="flex items-center gap-2 flex-shrink-0 ml-2"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {/* Mode badge — click to toggle */}
          <button
            onClick={async () => {
              const newMode = appMode === "coding" ? "general" : "coding"
              setAppMode(newMode)
              await window.electronAPI.setStoreValue("appMode", newMode)
            }}
            title="Click or press Ctrl+Shift+G to toggle mode"
            className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
              appMode === "coding"
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-blue-500/20 border-blue-500/40 text-blue-300"
            }`}
          >
            {appMode === "coding" ? <><Code2 className="w-3 h-3 inline mr-0.5" />Coding</> : <><Brain className="w-3 h-3 inline mr-0.5" />General</>}
          </button>

          {/* Voice input button */}
          <VoiceInput onTranscriptReady={handleVoiceTranscript} disabled={voiceLoading} />

          {/* Chat toggle */}
          <button
            onClick={() => setShowChat(prev => !prev)}
            title="Toggle chat (Ctrl+Shift+C)"
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
              showChat ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40" : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(prev => !prev)}
            title="Toggle history panel"
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
              showHistory ? "bg-white/15 text-white" : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80"
            }`}
          >
            <History className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── History Panel ────────────────────────────────────────────────── */}
      <AnswerHistory
        entries={historyEntries}
        isOpen={showHistory}
        onClear={() => setHistoryEntries([])}
        onSelectEntry={entry => {
          setVoiceAnswerText(entry.answer)
          setVoiceAnswerMeta({ providerId: entry.providerId, model: entry.model })
        }}
      />

      {/* ── Chat Panel ──────────────────────────────────────────────────── */}
      <ChatInput
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        onAddToHistory={(entry) => {
          const historyEntry: HistoryEntry = {
            id: `${Date.now()}-chat`,
            timestamp: new Date(),
            source: "voice",
            question: entry.question,
            answer: entry.answer,
            providerId: entry.providerId,
            model: entry.model,
            screenshotThumb: null
          }
          setHistoryEntries(prev => [historyEntry, ...prev].slice(0, 20))
        }}
      />

      {/* ── Voice answer overlay ─────────────────────────────────────────── */}
      {(voiceAnswerText || voiceLoading) && (
        <div
          className="border-b border-white/10 bg-black/60 px-4 py-3"
          style={{
            maxHeight: "45vh",
            overflowY: "auto",
            userSelect: "text",
            WebkitUserSelect: "text",
            WebkitAppRegion: "no-drag"
          } as React.CSSProperties}
        >
          {voiceLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-white/20 border-t-white/80 rounded-full animate-spin" />
              <span className="text-white/50 text-xs">Generating voice answer…</span>
            </div>
          ) : voiceAnswerText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-purple-400 font-medium select-none">Voice Answer</span>
                <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                  {voiceAnswerMeta && <span className="text-white/30 text-xs select-none">{voiceAnswerMeta.providerId} · {voiceAnswerMeta.model}</span>}
                  <button
                    style={{ pointerEvents: "all", WebkitAppRegion: "no-drag" } as React.CSSProperties}
                    onClick={() => { if (voiceAnswerText) window.electronAPI.writeClipboard(voiceAnswerText) }}
                    className="text-xs text-white/40 hover:text-white/70 border border-white/10 px-1.5 py-0.5 rounded select-none"
                  >Copy</button>
                  <button
                    style={{ pointerEvents: "all", WebkitAppRegion: "no-drag" } as React.CSSProperties}
                    onClick={() => setVoiceAnswerText(null)}
                    className="text-xs text-white/40 hover:text-white/70 select-none"
                  >✕</button>
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap" style={{ userSelect: "text" }}>{voiceAnswerText}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1">
        {view === "queue" ? (
          <Queue
            setView={setView}
            credits={credits}
            currentLanguage={currentLanguage}
            setLanguage={setLanguage}
          />
        ) : view === "solutions" ? (
          <Solutions
            setView={setView}
            credits={credits}
            currentLanguage={currentLanguage}
            setLanguage={setLanguage}
          />
        ) : null}
      </div>
    </div>
  )
}

export default SubscribedApp
