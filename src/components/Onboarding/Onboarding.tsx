// src/components/Onboarding/Onboarding.tsx — 5-step first-launch onboarding
import { useState } from "react"
import { Camera, Mic, Zap, Star, ArrowRight, Check, Loader2, Eye, EyeOff } from "lucide-react"

interface OnboardingProps {
  onComplete: () => void
}

const FREE_PROVIDERS = [
  {
    id: "gemini",
    name: "Google AI Studio",
    color: "bg-blue-500",
    description: "1500 free requests/day. Best vision.",
    url: "https://aistudio.google.com/",
    placeholder: "AIza..."
  },
  {
    id: "github",
    name: "GitHub Models",
    color: "bg-gray-600",
    description: "GPT-4o, Grok, DeepSeek. Free with GitHub account.",
    url: "https://github.com/marketplace/models",
    placeholder: "ghp_... or github_pat_..."
  },
  {
    id: "groq",
    name: "Groq",
    color: "bg-orange-500",
    description: "Ultra-fast LLaMA models. Generous free tier.",
    url: "https://console.groq.com/",
    placeholder: "gsk_..."
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    color: "bg-purple-500",
    description: "50+ free model options in one key.",
    url: "https://openrouter.ai/",
    placeholder: "sk-or-..."
  }
]

type ProviderKeyState = { key: string; showKey: boolean; status: "none" | "saved" | "saving" }

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [keyStates, setKeyStates] = useState<Record<string, ProviderKeyState>>(
    Object.fromEntries(FREE_PROVIDERS.map(p => [p.id, { key: "", showKey: false, status: "none" }]))
  )
  const [appMode, setAppMode] = useState<"general" | "coding">("general")

  const totalSteps = 5
  const savedCount = Object.values(keyStates).filter(k => k.status === "saved").length

  const updateKey = (id: string, patch: Partial<ProviderKeyState>) => {
    setKeyStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const handleSaveKey = async (id: string) => {
    const ks = keyStates[id]
    if (!ks.key.trim()) return
    updateKey(id, { status: "saving" })
    try {
      const ok = await window.electronAPI.saveKey(id, ks.key.trim())
      updateKey(id, { status: ok ? "saved" : "none", key: "" })
    } catch {
      updateKey(id, { status: "none" })
    }
  }

  const handleFinish = () => {
    // Fire-and-forget the IPC store writes — don't block the close on network roundtrips
    window.electronAPI.setStoreValue("appMode", appMode).catch(() => {})
    window.electronAPI.setStoreValue("onboardingCompleted", true).catch(() => {})
    // Close the onboarding immediately
    onComplete()
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative bg-gray-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 560, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-white/10 flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="overflow-y-auto p-8 flex-1">
          {/* Step counter */}
          <div className="text-white/30 text-xs font-medium mb-6 tracking-wider uppercase">
            Step {step + 1} of {totalSteps}
          </div>

          {/* ── Step 0: Welcome ─────────────────────────────────────── */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-white text-2xl font-bold mb-3">Welcome to AI Screen Assistant</h1>
              <p className="text-white/60 text-sm leading-relaxed mb-8">
                An invisible overlay that reads your screen and answers any question instantly — coding problems, interview questions, MCQs, documents, and more.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8 text-left">
                {[
                  { icon: <Camera className="w-4 h-4" />, title: "Screenshot to Answer", description: "Capture anything, get instant AI answers" },
                  { icon: <Mic className="w-4 h-4" />, title: "Voice Input", description: "Ask questions with your voice" },
                  { icon: <Star className="w-4 h-4" />, title: "8 AI Providers", description: "Multiple free providers with auto-fallback" }
                ].map((feat, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-blue-400 mb-2">{feat.icon}</div>
                    <p className="text-white text-xs font-medium">{feat.title}</p>
                    <p className="text-white/50 text-xs mt-1">{feat.description}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 1: Add First API Key ────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-white text-xl font-bold mb-1">Add Your First Free API Key</h2>
              <p className="text-white/60 text-sm mb-5">All four providers below have a free tier. You only need one to get started.</p>

              <div className="space-y-3">
                {FREE_PROVIDERS.map(provider => {
                  const ks = keyStates[provider.id]
                  const isSaved = ks.status === "saved"
                  return (
                    <div key={provider.id} className={`border rounded-xl p-3 transition-all ${isSaved ? "border-green-500/40 bg-green-500/5" : "border-white/10 bg-white/[0.02]"}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-4 h-4 rounded-full flex-shrink-0 ${provider.color}`} />
                        <span className="text-white font-medium text-sm">{provider.name}</span>
                        {isSaved && <Check className="w-4 h-4 text-green-400 ml-auto" />}
                      </div>
                      <p className="text-white/50 text-xs mb-2">{provider.description}</p>
                      {!isSaved && (
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type={ks.showKey ? "text" : "password"}
                              value={ks.key}
                              onChange={e => updateKey(provider.id, { key: e.target.value })}
                              onKeyDown={e => e.key === "Enter" && handleSaveKey(provider.id)}
                              placeholder={provider.placeholder}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs pr-7 outline-none focus:border-white/30"
                            />
                            <button onClick={() => updateKey(provider.id, { showKey: !ks.showKey })} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                              {ks.showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <button
                            onClick={() => handleSaveKey(provider.id)}
                            disabled={!ks.key.trim() || ks.status === "saving"}
                            className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 flex-shrink-0"
                          >
                            {ks.status === "saving" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            {ks.status === "saving" ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={() => window.electronAPI.openLink(provider.url)}
                            className="px-2 py-1.5 text-blue-400 text-xs border border-blue-500/20 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 flex-shrink-0"
                          >
                            Get key
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(0)} className="px-4 py-2 border border-white/10 rounded-lg text-white/60 text-sm hover:bg-white/5">
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2 bg-blue-600 rounded-lg text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
                >
                  {savedCount > 0 ? `Continue with ${savedCount} provider${savedCount > 1 ? "s" : ""}` : "Skip for now (add keys in Settings)"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Test Connection ───────────────────────────────── */}
          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">You're Ready!</h2>
              <p className="text-white/60 text-sm mb-4">
                You've saved keys for {savedCount} provider{savedCount > 1 ? "s" : ""}. The app will automatically pick the best available provider and fall back if one hits a rate limit.
              </p>
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-left text-sm mb-6 space-y-2">
                {FREE_PROVIDERS.filter(p => keyStates[p.id].status === "saved").map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${p.color}`} />
                    <span className="text-white/70">{p.name}</span>
                    <span className="text-green-400 text-xs ml-auto">✓ Ready</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-4 py-2 border border-white/10 rounded-lg text-white/60 text-sm hover:bg-white/5">
                  Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-2 bg-blue-600 rounded-lg text-white font-semibold text-sm hover:bg-blue-700">
                  Choose Mode <ArrowRight className="w-4 h-4 inline ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Choose Mode ───────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 className="text-white text-xl font-bold mb-2">Choose Your Default Mode</h2>
              <p className="text-white/60 text-sm mb-5">You can change this anytime with Ctrl+Shift+G or in Settings.</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {([
                  {
                    id: "general",
                    emoji: "🧠",
                    title: "General Mode",
                    description: "Best for: anything and everything. MCQs, behavioral questions, essays, coding problems, documents.",
                    recommended: true
                  },
                  {
                    id: "coding",
                    emoji: "💻",
                    title: "Coding Mode",
                    description: "Best for: LeetCode-style problems. Uses a 3-stage pipeline: extract → solve → debug.",
                    recommended: false
                  }
                ] as const).map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setAppMode(mode.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${appMode === mode.id ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"}`}
                  >
                    <div className="text-2xl mb-2">{mode.emoji}</div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">{mode.title}</span>
                      {mode.recommended && <span className="text-xs text-blue-400 border border-blue-500/30 px-1 rounded">Recommended</span>}
                    </div>
                    <p className="text-white/50 text-xs leading-relaxed">{mode.description}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-4 py-2 border border-white/10 rounded-lg text-white/60 text-sm hover:bg-white/5">
                  Back
                </button>
                <button onClick={() => setStep(4)} className="flex-1 py-2 bg-blue-600 rounded-lg text-white font-semibold text-sm hover:bg-blue-700">
                  Continue <ArrowRight className="w-4 h-4 inline ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Hotkey Cheat Sheet ────────────────────────────── */}
          {step === 4 && (
            <div>
              <h2 className="text-white text-xl font-bold mb-2">Hotkey Cheat Sheet</h2>
              <p className="text-white/60 text-sm mb-4">The app runs invisibly. You control everything with hotkeys.</p>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-5">
                {[
                  ["Ctrl+H / Cmd+H", "Take a screenshot", "primary"],
                  ["Ctrl+Enter / Cmd+Enter", "Analyze screenshot", "primary"],
                  ["Ctrl+Shift+V / Cmd+Shift+V", "Voice input", "secondary"],
                  ["Ctrl+Shift+G / Cmd+Shift+G", "Toggle General/Coding mode", "secondary"],
                  ["Ctrl+B / Cmd+B", "Show / Hide the overlay", "info"],
                  ["Ctrl+R / Cmd+R", "Clear and start over", "info"],
                  ["Ctrl+L / Cmd+L", "Delete last screenshot", "info"],
                  ["Ctrl+[ / Ctrl+]", "Decrease / Increase opacity", "info"],
                  ["Ctrl+Q / Cmd+Q", "Quit app", "info"]
                ].map(([keys, action, type], i) => (
                  <div key={i} className={`flex items-center gap-4 px-4 py-2.5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                    <span className={`font-mono text-xs flex-shrink-0 px-2 py-0.5 rounded ${
                      type === "primary" ? "text-blue-300 bg-blue-500/15" :
                      type === "secondary" ? "text-purple-300 bg-purple-500/15" :
                      "text-white/60 bg-white/5"
                    }`}>{keys}</span>
                    <span className="text-white/70 text-sm">{action}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleFinish}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
              >
                Start Using AI Screen Assistant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
