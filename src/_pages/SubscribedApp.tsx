// src/_pages/SubscribedApp.tsx — Main overlay with status bar, voice input, history panel
import React, { useEffect, useRef, useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import Queue from "./Queue"
import Solutions from "./Solutions"
import { useToast } from "../contexts/toast"
import { VoiceInput } from "../components/VoiceInput/VoiceInput"
import { AnswerHistory, type HistoryEntry } from "../components/History/AnswerHistory"
import { History, Code2, Brain } from "lucide-react"
import type { ProviderState } from "../providers/useProviderManager"

interface SubscribedAppProps {
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
  activeVisionProvider?: ProviderState | null
  activeTextProvider?: ProviderState | null
}

const SubscribedApp: React.FC<SubscribedAppProps> = ({
  credits,
  currentLanguage,
  setLanguage,
  activeVisionProvider,
  activeTextProvider
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

  // Load app mode from store on mount
  useEffect(() => {
    window.electronAPI.getStoreValue("appMode")
      .then(mode => setAppMode((mode as string ?? "general") as "general" | "coding"))
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

  // Handle voice transcript → AI answer
  const handleVoiceTranscript = useCallback(async (transcript: string) => {
    setVoiceLoading(true)
    setVoiceAnswerText(null)
    setVoiceAnswerMeta(null)
    setView("queue") // Stay on queue — voice answer overlays at bottom

    try {
      const result = await window.electronAPI.processVoiceQuestion(transcript)
      if (result.success && result.text) {
        setVoiceAnswerText(result.text)
        setVoiceAnswerMeta({ providerId: result.providerId ?? "", model: result.model ?? "" })

        // Add to history
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

  // Dimension sync
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (!containerRef.current) return
      const height = containerRef.current.scrollHeight || 600
      const width = containerRef.current.scrollWidth || 800
      window.electronAPI?.updateContentDimensions({ width, height })
    }

    updateDimensions()
    const fallback = setTimeout(() => {
      window.electronAPI?.updateContentDimensions({ width: 800, height: 600 })
    }, 500)

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    const mutationObserver = new MutationObserver(updateDimensions)
    mutationObserver.observe(containerRef.current, {
      childList: true, subtree: true, attributes: true, characterData: true
    })

    const delayed = setTimeout(updateDimensions, 1000)

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      clearTimeout(fallback)
      clearTimeout(delayed)
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

  // ── Derived status bar info ──────────────────────────────────────────────
  const activeProvider = activeVisionProvider ?? activeTextProvider
  const providerLabel = activeProvider
    ? `${activeProvider.adapter.config.name} · ${activeProvider.selectedModel}`
    : "No provider"
  const providerDot = activeProvider
    ? (activeProvider.keySaved ? "bg-green-400" : "bg-yellow-400")
    : "bg-red-400"

  return (
    <div ref={containerRef} className="min-h-0 flex flex-col">
      {/* ── Status Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/40 flex-shrink-0">
        {/* Left: provider dot + name — also the drag handle */}
        <div
          className="flex items-center gap-2 min-w-0 cursor-grab active:cursor-grabbing flex-1"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
          title="Drag to move the overlay"
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${providerDot}`} />
          <span className="text-white/50 text-xs truncate max-w-[160px]">{providerLabel}</span>
          {/* Grip dots — visual hint that this area is draggable */}
          <span className="text-white/20 text-xs ml-auto mr-2 select-none">⠿</span>
        </div>

        {/* Right: mode badge + voice + history — NOT draggable */}
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

      {/* ── History Panel (Step 9) ───────────────────────────────────── */}
      <AnswerHistory
        entries={historyEntries}
        isOpen={showHistory}
        onClear={() => setHistoryEntries([])}
        onSelectEntry={entry => {
          setVoiceAnswerText(entry.answer)
          setVoiceAnswerMeta({ providerId: entry.providerId, model: entry.model })
        }}
      />

      {/* ── Voice answer overlay ─────────────────────────────────────── */}
      {(voiceAnswerText || voiceLoading) && (
        <div className="border-b border-white/10 bg-black/60 px-4 py-3">
          {voiceLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-white/20 border-t-white/80 rounded-full animate-spin" />
              <span className="text-white/50 text-xs">Generating voice answer…</span>
            </div>
          ) : voiceAnswerText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-400 font-medium">Voice Answer</span>
                <div className="flex items-center gap-2">
                  {voiceAnswerMeta && <span className="text-white/30 text-xs">{voiceAnswerMeta.providerId} · {voiceAnswerMeta.model}</span>}
                  <button onClick={() => navigator.clipboard.writeText(voiceAnswerText)} className="text-xs text-white/40 hover:text-white/70 border border-white/10 px-1.5 py-0.5 rounded">Copy</button>
                  <button onClick={() => setVoiceAnswerText(null)} className="text-xs text-white/40 hover:text-white/70">✕</button>
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{voiceAnswerText}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
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
