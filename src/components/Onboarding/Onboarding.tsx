import { useState, useEffect } from "react"
import { Camera, Mic, Zap, Star, ArrowRight, Check, Loader2, Eye, EyeOff, MessageCircle, AlertCircle } from "lucide-react"
import { PROVIDER_REGISTRY, DEFAULT_PROVIDER_ORDER } from "../../providers/registry"
import { ProviderLogo } from "../shared/ProviderLogo"

interface OnboardingProps {
  onComplete: () => void
}


type ProviderKeyState = {
  key: string
  accountId: string
  showKey: boolean
  status: "none" | "saved" | "saving" | "testing" | "tested" | "test-failed"
  testError: string
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [keyStates, setKeyStates] = useState<Record<string, ProviderKeyState>>(
    Object.fromEntries(DEFAULT_PROVIDER_ORDER.map(id => [id, { key: "", accountId: "", showKey: false, status: "none", testError: "" }]))
  )
  const [appMode, setAppMode] = useState<"general" | "coding">("general")
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({})

  const totalSteps = 5
  const savedCount = Object.values(keyStates).filter(k => k.status === "saved" || k.status === "tested").length

  // Load custom shortcuts for cheat sheet display
  useEffect(() => {
    window.electronAPI.getStoreValue("customShortcuts").then((custom: any) => {
      setShortcuts(custom ?? {})
    }).catch(() => {})
  }, [])

  const updateKey = (id: string, patch: Partial<ProviderKeyState>) => {
    setKeyStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const handleSaveKey = async (id: string) => {
    const ks = keyStates[id]
    if (!ks.key.trim()) return
    updateKey(id, { status: "saving", testError: "" })
    try {
      // Save account ID for Cloudflare
      if (id === "cloudflare" && ks.accountId.trim()) {
        await window.electronAPI.setStoreValue("cloudflareAccountId", ks.accountId.trim())
      }
      const ok = await window.electronAPI.saveKey(id, ks.key.trim())
      updateKey(id, { status: ok ? "saved" : "none" })
    } catch {
      updateKey(id, { status: "none", testError: "Failed to save key" })
    }
  }

  const handleTestKey = async (id: string) => {
    const ks = keyStates[id]
    if (ks.status !== "saved" && ks.status !== "tested" && ks.status !== "test-failed") return
    updateKey(id, { status: "testing", testError: "" })
    try {
      const adapter = PROVIDER_REGISTRY[id]
      const savedKey = await window.electronAPI.getKey(id)
      if (!savedKey) {
        updateKey(id, { status: "test-failed", testError: "No key found" })
        return
      }
      const accountId = id === "cloudflare"
        ? ((await window.electronAPI.getStoreValue("cloudflareAccountId") as string) ?? "")
        : undefined
      const response = await adapter.call(savedKey, "Reply with just the word HELLO", null, adapter.config.defaultModel, "", accountId)
      if (response.error) {
        updateKey(id, { status: "test-failed", testError: response.error.slice(0, 80) })
      } else {
        updateKey(id, { status: "tested", testError: "" })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      updateKey(id, { status: "test-failed", testError: msg.slice(0, 80) })
    }
  }

  const handleFinish = () => {
    window.electronAPI.setStoreValue("appMode", appMode).catch(() => {})
    window.electronAPI.setStoreValue("onboardingCompleted", true).catch(() => {})
    onComplete()
  }

  // Helper to get display shortcut
  const getShortcut = (key: string, fallback: string): string => {
    const val = shortcuts[key] ?? fallback
    return val.replace(/CommandOrControl/g, "Ctrl").replace(/\+/g, "+")
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative bg-gray-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 600, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
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
                  { icon: <MessageCircle className="w-4 h-4" />, title: "Chat Mode", description: "Type and chat like ChatGPT, invisible" }
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

          {/* ── Step 1: Add API Keys (All 8 providers) ────────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-white text-xl font-bold mb-1">Add Your API Keys</h2>
              <p className="text-white/60 text-sm mb-5">All providers marked <span className="text-green-400">FREE</span> have a generous free tier. You only need <strong>one</strong> to get started.</p>

              <div className="space-y-3">
                {DEFAULT_PROVIDER_ORDER.map(id => {
                  const adapter = PROVIDER_REGISTRY[id]
                  const ks = keyStates[id]
                  const isSaved = ks.status === "saved" || ks.status === "tested"
                  const isTested = ks.status === "tested"
                  const isFailed = ks.status === "test-failed"

                  return (
                    <div key={id} className={`border rounded-xl p-3 transition-all ${
                      isTested ? "border-green-500/40 bg-green-500/5" :
                      isSaved ? "border-yellow-500/30 bg-yellow-500/5" :
                      isFailed ? "border-red-500/30 bg-red-500/5" :
                      "border-white/10 bg-white/[0.02]"
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <ProviderLogo providerId={id} size={18} />
                        <span className="text-white font-medium text-sm">{adapter.config.name}</span>
                        {adapter.config.isFree && <span className="text-xs text-green-400 border border-green-500/30 px-1 rounded">FREE</span>}
                        {!adapter.config.isFree && <span className="text-xs text-white/30 border border-white/10 px-1 rounded">PAID</span>}
                        {isTested && <Check className="w-4 h-4 text-green-400 ml-auto" />}
                        {isSaved && !isTested && <span className="text-xs text-yellow-400 ml-auto">Saved</span>}
                      </div>
                      <p className="text-white/50 text-xs mb-2">{adapter.config.description}</p>

                      {/* Error */}
                      {ks.testError && (
                        <div className="flex items-center gap-1.5 mb-2 text-red-400 text-xs">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{ks.testError}</span>
                        </div>
                      )}

                      {!isSaved && !isTested && (
                        <div className="space-y-2">
                          {/* Cloudflare needs account ID */}
                          {id === "cloudflare" && (
                            <input
                              type="text"
                              value={ks.accountId}
                              onChange={e => updateKey(id, { accountId: e.target.value })}
                              placeholder="Cloudflare Account ID"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-white/30"
                            />
                          )}
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type={ks.showKey ? "text" : "password"}
                                value={ks.key}
                                onChange={e => updateKey(id, { key: e.target.value })}
                                onKeyDown={e => e.key === "Enter" && handleSaveKey(id)}
                                placeholder={`Paste your ${adapter.config.name} key`}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs pr-7 outline-none focus:border-white/30"
                              />
                              <button onClick={() => updateKey(id, { showKey: !ks.showKey })} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                                {ks.showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <button
                              onClick={() => handleSaveKey(id)}
                              disabled={!ks.key.trim() || ks.status === "saving"}
                              className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 flex-shrink-0"
                            >
                              {ks.status === "saving" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              {ks.status === "saving" ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={() => window.electronAPI.openLink(adapter.config.signupUrl)}
                              className="px-2 py-1.5 text-blue-400 text-xs border border-blue-500/20 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 flex-shrink-0"
                            >
                              Get key
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Test button for saved keys */}
                      {(isSaved || isFailed) && (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleTestKey(id)}
                            disabled={ks.status === "testing"}
                            className="px-3 py-1.5 bg-white/10 text-white text-xs font-medium rounded-lg hover:bg-white/15 transition-colors disabled:opacity-40 flex items-center gap-1"
                          >
                            {ks.status === "testing" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            {ks.status === "testing" ? "Testing…" : "Test Key"}
                          </button>
                          <button
                            onClick={() => updateKey(id, { status: "none", key: "", testError: "" })}
                            className="text-white/40 text-xs hover:text-white/70"
                          >
                            Change Key
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

          {/* ── Step 2: Summary ───────────────────────────────────── */}
          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">
                {savedCount > 0 ? "You're Ready!" : "No Keys Added Yet"}
              </h2>
              <p className="text-white/60 text-sm mb-4">
                {savedCount > 0
                  ? `You've saved keys for ${savedCount} provider${savedCount > 1 ? "s" : ""}. The app will auto-pick the best available provider and fall back if one hits a rate limit.`
                  : "You can add API keys later from Settings. The app needs at least one key to function."
                }
              </p>
              {savedCount > 0 && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-left text-sm mb-6 space-y-2">
                  {DEFAULT_PROVIDER_ORDER.filter(id => {
                    const ks = keyStates[id]
                    return ks.status === "saved" || ks.status === "tested"
                  }).map(id => {
                    const adapter = PROVIDER_REGISTRY[id]
                    const ks = keyStates[id]
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <ProviderLogo providerId={id} size={14} />
                        <span className="text-white/70">{adapter.config.name}</span>
                        <span className={`text-xs ml-auto ${ks.status === "tested" ? "text-green-400" : "text-yellow-400"}`}>
                          {ks.status === "tested" ? "✓ Tested" : "✓ Saved"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
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

          {/* ── Step 3: Choose Mode ───────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 className="text-white text-xl font-bold mb-2">Choose Your Default Mode</h2>
              <p className="text-white/60 text-sm mb-5">You can change this anytime with {getShortcut("toggleMode", "CommandOrControl+Shift+G")} or in Settings.</p>
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

          {/* ── Step 4: Hotkey Cheat Sheet (with custom shortcuts + new Chat) ── */}
          {step === 4 && (
            <div>
              <h2 className="text-white text-xl font-bold mb-2">Hotkey Cheat Sheet</h2>
              <p className="text-white/60 text-sm mb-4">The app runs invisibly. You control everything with hotkeys. Customize them anytime in Settings → Shortcuts.</p>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-5">
                {[
                  [getShortcut("takeScreenshot", "CommandOrControl+H"), "Take a screenshot", "primary"],
                  [getShortcut("processScreenshots", "CommandOrControl+Enter"), "Analyze screenshot", "primary"],
                  [getShortcut("toggleVoice", "CommandOrControl+Shift+V"), "Voice input", "secondary"],
                  [getShortcut("toggleChat", "CommandOrControl+Shift+C"), "Chat mode (type questions)", "secondary"],
                  [getShortcut("toggleMode", "CommandOrControl+Shift+G"), "Toggle General/Coding mode", "secondary"],
                  [getShortcut("toggleVisibility", "CommandOrControl+B"), "Show / Hide the overlay", "info"],
                  [getShortcut("resetSession", "CommandOrControl+R"), "Clear and start over", "info"],
                  [getShortcut("deleteLastScreenshot", "CommandOrControl+L"), "Delete last screenshot", "info"],
                  [`${getShortcut("decreaseOpacity", "CommandOrControl+[")} / ${getShortcut("increaseOpacity", "CommandOrControl+]")}`, "Decrease / Increase opacity", "info"],
                  [getShortcut("quitApp", "CommandOrControl+Q"), "Quit app", "info"]
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
