// src/components/Settings/SettingsDialog.tsx — Full 4-tab settings dialog
import React, { useState, useEffect, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  X, Eye, EyeOff, GripVertical, Check, RefreshCw, Trash2, Loader2
} from "lucide-react"
import { PROVIDER_REGISTRY, DEFAULT_PROVIDER_ORDER } from "../../providers/registry"
import type { ProviderState } from "../../providers/useProviderManager"

// ── Provider Colors ────────────────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  gemini: "bg-blue-500",
  groq: "bg-orange-500",
  github: "bg-gray-500",
  openrouter: "bg-purple-500",
  cerebras: "bg-green-500",
  mistral: "bg-red-500",
  cohere: "bg-rose-400",
  cloudflare: "bg-amber-500"
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "apikeys" | "models" | "priority" | "preferences"
type KeyStatus = "none" | "saved" | "working" | "failed"

interface ProviderKeyState {
  apiKey: string
  accountId: string
  showKey: boolean
  keyStatus: KeyStatus
  testing: boolean
  testError: string
}

interface SettingsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  providerStates?: ProviderState[]
  onRefreshKeyStatus?: () => void
}

// ── Sortable Row ──────────────────────────────────────────────────────────────
function SortableProviderRow({
  id, providerId, keySaved, supportsVision, isFree
}: {
  id: string
  providerId: string
  keySaved: boolean
  supportsVision: boolean
  isFree: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const adapter = PROVIDER_REGISTRY[providerId]
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const colorClass = PROVIDER_COLORS[providerId] ?? "bg-slate-500"

  return (
    <div
      ref={setNodeRef}
      style={{ ...style }}
      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 mb-2 cursor-default select-none"
    >
      <button {...attributes} {...listeners} className="text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing flex-shrink-0">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colorClass}`} />
      <span className="text-white/80 text-sm flex-1 font-medium">{adapter?.config.name ?? providerId}</span>
      {isFree && <span className="text-xs text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded">FREE</span>}
      <span className={`w-2 h-2 rounded-full ${keySaved ? "bg-green-400" : "bg-white/20"}`} title={keySaved ? "Key saved" : "No key"} />
      <span className="text-white/40 text-xs">{supportsVision ? "👁" : "T"}</span>
    </div>
  )
}

// ── Main SettingsDialog ───────────────────────────────────────────────────────
export function SettingsDialog({ open: externalOpen, onOpenChange, providerStates = [], onRefreshKeyStatus }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(externalOpen ?? false)
  const [activeTab, setActiveTab] = useState<Tab>("apikeys")

  // Per-provider key state
  const [keyStates, setKeyStates] = useState<Record<string, ProviderKeyState>>({})

  // Model preferences
  const [modelPrefs, setModelPrefs] = useState<Record<string, string>>({})

  // Priority order for drag-and-drop
  const [priorityOrder, setPriorityOrder] = useState<string[]>([...DEFAULT_PROVIDER_ORDER])

  // Preferences
  const [customPrompt, setCustomPrompt] = useState("")
  const [appMode, setAppMode] = useState<"general" | "coding">("general")
  const [answerLanguage, setAnswerLanguage] = useState("auto")
  const [showProviderUsed, setShowProviderUsed] = useState(true)
  const [autoAnalyze, setAutoAnalyze] = useState(false)

  // Saved indicator
  const [savedField, setSavedField] = useState<string | null>(null)

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Sync external open state
  useEffect(() => {
    if (externalOpen !== undefined) setIsOpen(externalOpen)
  }, [externalOpen])

  const handleClose = () => {
    setIsOpen(false)
    onOpenChange?.(false)
  }

  // Load data when dialog opens
  useEffect(() => {
    if (!isOpen) return
    ;(async () => {
      try {
        const [store, savedProviders] = await Promise.all([
          window.electronAPI.getStore(),
          window.electronAPI.getAllSavedProviders()
        ])

        const savedSet = new Set<string>(savedProviders ?? [])
        const prefs: Record<string, string> = (store?.modelPreferences as Record<string, string>) ?? {}
        setModelPrefs(prefs)
        setPriorityOrder((store?.providerOrder as string[]) ?? DEFAULT_PROVIDER_ORDER)
        setCustomPrompt((store?.customPrompt as string) ?? "")
        setAppMode(((store?.appMode as string) ?? "general") as "general" | "coding")
        setAnswerLanguage((store?.answerLanguage as string) ?? "auto")
        setShowProviderUsed((store?.showProviderUsed as boolean) ?? true)
        setAutoAnalyze((store?.autoAnalyzeOnScreenshot as boolean) ?? false)

        // Load cloudflare account ID
        const cfAccountId = (store?.cloudflareAccountId as string) ?? ""

        // Initialize key states
        const initKeyStates: Record<string, ProviderKeyState> = {}
        for (const id of DEFAULT_PROVIDER_ORDER) {
          initKeyStates[id] = {
            apiKey: "",
            accountId: id === "cloudflare" ? cfAccountId : "",
            showKey: false,
            keyStatus: savedSet.has(id) ? "saved" : "none",
            testing: false,
            testError: ""
          }
        }
        setKeyStates(initKeyStates)
      } catch (err) {
        console.error("Settings load error:", err)
      }
    })()
  }, [isOpen])

  const updateKeyState = useCallback((id: string, patch: Partial<ProviderKeyState>) => {
    setKeyStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }, [])

  // Save API key
  const handleSaveKey = async (providerId: string) => {
    const ks = keyStates[providerId]
    if (!ks) return
    const key = ks.apiKey.trim()
    if (!key) return showToast("Please enter an API key", "error")

    const ok = await window.electronAPI.saveKey(providerId, key)
    if (providerId === "cloudflare" && ks.accountId.trim()) {
      await window.electronAPI.setStoreValue("cloudflareAccountId", ks.accountId.trim())
    }
    if (ok) {
      updateKeyState(providerId, { keyStatus: "saved", apiKey: "" })
      showToast("Key saved ✓")
      onRefreshKeyStatus?.()
    } else {
      showToast("Failed to save key", "error")
    }
  }

  // Test API key
  const handleTestKey = async (providerId: string) => {
    updateKeyState(providerId, { testing: true, testError: "" })
    try {
      const adapter = PROVIDER_REGISTRY[providerId]
      const savedKey = await window.electronAPI.getKey(providerId)
      if (!savedKey) {
        updateKeyState(providerId, { testing: false, testError: "No key saved", keyStatus: "failed" })
        return
      }
      const model = modelPrefs[providerId] ?? adapter.config.defaultModel
      const accountId = providerId === "cloudflare"
        ? ((await window.electronAPI.getStoreValue("cloudflareAccountId") as string) ?? "")
        : undefined
      const response = await adapter.call(savedKey, "Reply with just the word HELLO", null, model, "", accountId)
      if (response.error) {
        updateKeyState(providerId, { testing: false, testError: response.error.slice(0, 80), keyStatus: "failed" })
      } else {
        updateKeyState(providerId, { testing: false, testError: "", keyStatus: "working" })
        showToast(`${adapter.config.name} is working ✓`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      updateKeyState(providerId, { testing: false, testError: msg.slice(0, 80), keyStatus: "failed" })
    }
  }

  // Remove API key
  const handleDeleteKey = async (providerId: string) => {
    await window.electronAPI.deleteKey(providerId)
    updateKeyState(providerId, { keyStatus: "none", apiKey: "", testError: "" })
    onRefreshKeyStatus?.()
    showToast("Key removed")
  }

  // Drag end for priority tab
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIdx = priorityOrder.indexOf(active.id as string)
      const newIdx = priorityOrder.indexOf(over.id as string)
      const newOrder = arrayMove(priorityOrder, oldIdx, newIdx)
      setPriorityOrder(newOrder)
      window.electronAPI.setStoreValue("providerOrder", newOrder)
    }
  }

  const saveStoreValue = async (key: string, value: unknown) => {
    await window.electronAPI.setStoreValue(key, value)
    setSavedField(key)
    setTimeout(() => setSavedField(null), 1500)
  }

  if (!isOpen) return null

  const configuredCount = DEFAULT_PROVIDER_ORDER.filter(id => keyStates[id]?.keyStatus !== "none").length
  const visionReady = DEFAULT_PROVIDER_ORDER.filter(id => {
    if (keyStates[id]?.keyStatus === "none") return false
    const adapter = PROVIDER_REGISTRY[id]
    const model = modelPrefs[id] ?? adapter.config.defaultModel
    const sv = adapter.config.supportsVision
    return typeof sv === "boolean" ? sv : sv(model)
  }).length

  const tabs: { id: Tab; label: string }[] = [
    { id: "apikeys", label: "API Keys" },
    { id: "models", label: "Models" },
    { id: "priority", label: "Priority Order" },
    { id: "preferences", label: "Preferences" }
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
          toast.type === "success" ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      <div
        className="relative bg-gray-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 680, maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-white font-semibold text-lg">Settings</h2>
          <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-white border-blue-500"
                  : "text-white/50 border-transparent hover:text-white/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── API Keys Tab ─────────────────────────────────────────── */}
          {activeTab === "apikeys" && (
            <div className="space-y-4">
              {DEFAULT_PROVIDER_ORDER.map(id => {
                const adapter = PROVIDER_REGISTRY[id]
                const ks = keyStates[id] ?? { apiKey: "", accountId: "", showKey: false, keyStatus: "none", testing: false, testError: "" }
                const colorClass = PROVIDER_COLORS[id] ?? "bg-slate-500"
                const statusDot = { none: "bg-white/20", saved: "bg-yellow-400", working: "bg-green-400", failed: "bg-red-400" }[ks.keyStatus]
                const statusLabel = { none: "No key saved", saved: "Key saved — not tested", working: "Tested and working", failed: "Test failed" }[ks.keyStatus]

                return (
                  <div key={id} className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
                    {/* Provider header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 ${colorClass}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium text-sm">{adapter.config.name}</span>
                            {adapter.config.isFree
                              ? <span className="text-xs text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded">FREE</span>
                              : <span className="text-xs text-white/40 border border-white/10 px-1.5 py-0.5 rounded">PAID</span>
                            }
                          </div>
                          <p className="text-white/50 text-xs mt-0.5">{adapter.config.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                        <span className="text-white/40 text-xs">{statusLabel}</span>
                      </div>
                    </div>
                    <p className="text-white/20 text-xs font-mono mb-3">{adapter.config.baseUrl}</p>

                    {/* Inputs */}
                    {id === "cloudflare" ? (
                      <div className="space-y-2 mb-3">
                        <div>
                          <label className="text-white/60 text-xs mb-1 block">API Token</label>
                          <div className="relative">
                            <input
                              type={ks.showKey ? "text" : "password"}
                              value={ks.apiKey}
                              onChange={e => updateKeyState(id, { apiKey: e.target.value })}
                              placeholder="Paste your API token here"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm pr-10 outline-none focus:border-white/30"
                            />
                            <button onClick={() => updateKeyState(id, { showKey: !ks.showKey })} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                              {ks.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-white/60 text-xs mb-1 block">Account ID</label>
                          <input
                            type="text"
                            value={ks.accountId}
                            onChange={e => updateKeyState(id, { accountId: e.target.value })}
                            placeholder="Your Cloudflare Account ID"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <label className="text-white/60 text-xs mb-1 block">API Key</label>
                        <div className="relative">
                          <input
                            type={ks.showKey ? "text" : "password"}
                            value={ks.apiKey}
                            onChange={e => updateKeyState(id, { apiKey: e.target.value })}
                            placeholder="Paste your API key here"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm pr-10 outline-none focus:border-white/30"
                          />
                          <button onClick={() => updateKeyState(id, { showKey: !ks.showKey })} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                            {ks.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {ks.testError && <p className="text-red-400 text-xs mb-2">{ks.testError}</p>}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSaveKey(id)} className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 transition-colors">
                        Save
                      </button>
                      <button
                        onClick={() => handleTestKey(id)}
                        disabled={ks.testing || ks.keyStatus === "none"}
                        className="px-3 py-1.5 bg-white/10 text-white text-xs font-medium rounded-lg hover:bg-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {ks.testing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {ks.testing ? "Testing…" : "Test"}
                      </button>
                      {ks.keyStatus !== "none" && (
                        <button onClick={() => handleDeleteKey(id)} className="px-3 py-1.5 text-red-400/80 hover:text-red-400 text-xs font-medium rounded-lg flex items-center gap-1 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3 h-3" /> Remove Key
                        </button>
                      )}
                      <a
                        onClick={() => window.electronAPI.openLink(adapter.config.signupUrl)}
                        className="text-blue-400 text-xs hover:underline cursor-pointer ml-auto"
                      >
                        Get free key →
                      </a>
                    </div>
                  </div>
                )
              })}

              {/* Summary */}
              <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm">
                <p className="text-white/60">Providers configured: <span className="text-white font-medium">{configuredCount} / 8</span></p>
                <p className="text-white/60 mt-1">Vision-capable providers ready: <span className="text-white font-medium">{visionReady}</span></p>
              </div>
            </div>
          )}

          {/* ── Models Tab ──────────────────────────────────────────── */}
          {activeTab === "models" && (
            <div className="space-y-6">
              {DEFAULT_PROVIDER_ORDER.map(id => {
                const adapter = PROVIDER_REGISTRY[id]
                const ks = keyStates[id]
                const hasKey = ks && ks.keyStatus !== "none"
                const colorClass = PROVIDER_COLORS[id] ?? "bg-slate-500"
                const currentModel = modelPrefs[id] ?? adapter.config.defaultModel

                return (
                  <div key={id} className={`border rounded-xl p-4 ${hasKey ? "border-white/10 bg-white/[0.02]" : "border-white/5 bg-black/20 opacity-50"}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 ${colorClass}`} />
                      <span className={`text-sm font-medium ${hasKey ? "text-white" : "text-white/40"}`}>{adapter.config.name}</span>
                      {!hasKey && <span className="text-xs text-white/30 ml-1">— Add API key first</span>}
                    </div>

                    {adapter.config.models === "freetext" ? (
                      <div>
                        <input
                          type="text"
                          value={currentModel}
                          onChange={e => {
                            const v = e.target.value
                            setModelPrefs(prev => ({ ...prev, [id]: v }))
                          }}
                          onBlur={() => {
                            window.electronAPI.setStoreValue("modelPreferences", { ...modelPrefs, [id]: currentModel })
                          }}
                          disabled={!hasKey}
                          placeholder="e.g. meta-llama/llama-3.2-11b-vision-instruct:free"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          {[
                            { id: "meta-llama/llama-3.2-11b-vision-instruct:free", label: "Llama Vision", vision: true },
                            { id: "google/gemini-2.0-flash-exp:free", label: "Gemini Flash", vision: true },
                            { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B", vision: false },
                            { id: "deepseek/deepseek-r1:free", label: "DeepSeek R1", vision: false }
                          ].map(chip => (
                            <button
                              key={chip.id}
                              disabled={!hasKey}
                              onClick={() => {
                                setModelPrefs(prev => ({ ...prev, [id]: chip.id }))
                                window.electronAPI.setStoreValue("modelPreferences", { ...modelPrefs, [id]: chip.id })
                              }}
                              className="px-2 py-1 text-xs rounded-md border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white flex items-center gap-1 disabled:cursor-not-allowed"
                            >
                              <span>{chip.vision ? "👁" : "T"}</span> {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <select
                        value={currentModel}
                        disabled={!hasKey}
                        onChange={e => {
                          const v = e.target.value
                          setModelPrefs(prev => ({ ...prev, [id]: v }))
                          window.electronAPI.setStoreValue("modelPreferences", { ...modelPrefs, [id]: v })
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 disabled:cursor-not-allowed"
                      >
                        {(adapter.config.models as string[]).map(m => {
                          const sv = adapter.config.supportsVision
                          const isVision = typeof sv === "boolean" ? sv : sv(m)
                          return (
                            <option key={m} value={m} className="bg-gray-900">
                              {isVision ? "👁 " : "T "}{m}
                            </option>
                          )
                        })}
                      </select>
                    )}
                  </div>
                )
              })}

              {/* Active provider summary */}
              {(() => {
                const textProvider = providerStates.find(ps => ps.keySaved)
                const visionProviderItem = providerStates.find(ps => {
                  if (!ps.keySaved) return false
                  const sv = ps.adapter.config.supportsVision
                  return typeof sv === "boolean" ? sv : sv(ps.selectedModel)
                })
                return (
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm space-y-1">
                    <p className="text-white/70">
                      Vision requests will use: <span className="text-white font-medium">
                        {visionProviderItem ? `${visionProviderItem.adapter.config.name} · ${visionProviderItem.selectedModel}` : "No provider configured"}
                      </span>
                    </p>
                    <p className="text-white/70">
                      Text requests will use: <span className="text-white font-medium">
                        {textProvider ? `${textProvider.adapter.config.name} · ${textProvider.selectedModel}` : "No provider configured"}
                      </span>
                    </p>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── Priority Order Tab ───────────────────────────────────── */}
          {activeTab === "priority" && (
            <div>
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm text-white/70 mb-4">
                The app picks the highest-priority provider that has a saved key. For screen analysis it needs a vision-capable provider. Drag to reorder.
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={priorityOrder} strategy={verticalListSortingStrategy}>
                  {priorityOrder.map(id => {
                    const adapter = PROVIDER_REGISTRY[id]
                    if (!adapter) return null
                    const ks = keyStates[id]
                    const sv = adapter.config.supportsVision
                    const supportsVision = typeof sv === "boolean" ? sv : sv(adapter.config.defaultModel)
                    return (
                      <SortableProviderRow
                        key={id}
                        id={id}
                        providerId={id}
                        keySaved={ks ? ks.keyStatus !== "none" : false}
                        supportsVision={supportsVision}
                        isFree={adapter.config.isFree}
                      />
                    )
                  })}
                </SortableContext>
              </DndContext>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setPriorityOrder([...DEFAULT_PROVIDER_ORDER])
                    window.electronAPI.setStoreValue("providerOrder", DEFAULT_PROVIDER_ORDER)
                    showToast("Reset to default order")
                  }}
                  className="flex-1 py-2 border border-white/10 rounded-lg text-white/60 text-sm hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset to Default
                </button>
                <button
                  onClick={() => {
                    const withKey = priorityOrder.filter(id => keyStates[id]?.keyStatus !== "none")
                    const withoutKey = priorityOrder.filter(id => keyStates[id]?.keyStatus === "none")
                    const newOrder = [...withKey, ...withoutKey]
                    setPriorityOrder(newOrder)
                    window.electronAPI.setStoreValue("providerOrder", newOrder)
                    showToast("Auto-arranged by key status")
                  }}
                  className="flex-1 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-600/30 transition-colors"
                >
                  Auto-Arrange
                </button>
              </div>
            </div>
          )}

          {/* ── Preferences Tab ──────────────────────────────────────── */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              {/* Custom Context */}
              <div>
                <label className="text-white text-sm font-medium block mb-1">Custom Context</label>
                <p className="text-white/50 text-xs mb-2">Added to every AI prompt to personalize answers. Include your background, role, or what type of questions to expect.</p>
                <textarea
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  onBlur={() => saveStoreValue("customPrompt", customPrompt)}
                  rows={4}
                  placeholder="Example: I am a senior React developer applying for frontend roles. I prefer TypeScript solutions."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 resize-none"
                />
                {savedField === "customPrompt" && <p className="text-green-400 text-xs mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Saved</p>}
              </div>

              {/* App Mode */}
              <div>
                <label className="text-white text-sm font-medium block mb-2">App Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["general", "coding"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => { setAppMode(mode); saveStoreValue("appMode", mode) }}
                      className={`p-3 rounded-xl border text-left transition-all ${appMode === mode ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"}`}
                    >
                      <p className="text-white font-medium text-sm capitalize">{mode} Mode</p>
                      <p className="text-white/50 text-xs mt-1">
                        {mode === "general" ? "Answers any on-screen content — interviews, MCQs, essays, general questions." : "Optimized three-stage pipeline for LeetCode-style coding problems."}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Answer Language */}
              <div>
                <label className="text-white text-sm font-medium block mb-1">Answer Language</label>
                <select
                  value={answerLanguage}
                  onChange={e => { setAnswerLanguage(e.target.value); saveStoreValue("answerLanguage", e.target.value) }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
                >
                  {[["auto","Auto (same as question)"],["en","English"],["hi","Hindi"],["es","Spanish"],["fr","French"],["de","German"],["pt","Portuguese"],["ar","Arabic"],["zh","Chinese"],["ja","Japanese"]].map(([v,l]) => (
                    <option key={v} value={v} className="bg-gray-900">{l}</option>
                  ))}
                </select>
              </div>

              {/* Toggles */}
              {[
                { key: "showProviderUsed", label: "Show Provider Used", val: showProviderUsed, setter: setShowProviderUsed, help: "Display which AI provider generated each answer at the bottom of the answer panel." },
                { key: "autoAnalyzeOnScreenshot", label: "Auto-Analyze on Screenshot", val: autoAnalyze, setter: setAutoAnalyze, help: "Automatically start AI analysis when you take a screenshot, without pressing the process hotkey." }
              ].map(({ key, label, val, setter, help }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div>
                    <label className="text-white text-sm font-medium">{label}</label>
                    <p className="text-white/50 text-xs mt-0.5">{help}</p>
                  </div>
                  <button
                    onClick={() => {
                      const newVal = !val
                      setter(newVal)
                      saveStoreValue(key, newVal)
                    }}
                    className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative mt-0.5 ${val ? "bg-blue-600" : "bg-white/20"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? "left-6" : "left-1"}`} />
                  </button>
                </div>
              ))}

              {/* Keyboard Shortcuts Reference */}
              <div>
                <label className="text-white text-sm font-medium block mb-2">Keyboard Shortcuts</label>
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {[
                      ["Capture & analyze screen", "Ctrl+Enter / Cmd+Enter"],
                      ["Toggle visibility", "Ctrl+B / Cmd+B"],
                      ["Take screenshot", "Ctrl+H / Cmd+H"],
                      ["Toggle voice input", "Ctrl+Shift+V / Cmd+Shift+V"],
                      ["Toggle mode (General/Coding)", "Ctrl+Shift+G / Cmd+Shift+G"],
                      ["Move window", "Ctrl+Arrow Keys"],
                      ["Delete last screenshot", "Ctrl+L / Cmd+L"],
                      ["Reset / new session", "Ctrl+R / Cmd+R"],
                      ["Decrease opacity", "Ctrl+[ / Cmd+["],
                      ["Increase opacity", "Ctrl+] / Cmd+]"],
                      ["Quit app", "Ctrl+Q / Cmd+Q"]
                    ].map(([action, keys]) => (
                      <React.Fragment key={action}>
                        <span className="text-white/60">{action}</span>
                        <span className="text-white/90 font-mono">{keys}</span>
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="text-white/30 text-xs mt-3">Hotkey customization requires editing the source code and restarting the app.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
