// src/providers/useProviderManager.ts — React hook for managing multi-provider state
import { useState, useEffect, useCallback } from "react"
import { PROVIDER_REGISTRY, DEFAULT_PROVIDER_ORDER, getProvidersSortedByOrder, adapterSupportsVision } from "./registry"
import type { FullProviderAdapter } from "./types"

export interface ProviderState {
  adapter: FullProviderAdapter
  keySaved: boolean
  selectedModel: string
  /** Position in the priority list (0 = highest priority) */
  priorityIndex: number
}

interface ProviderManagerState {
  providerStates: ProviderState[]
  providerOrder: string[]
  isLoaded: boolean
}

export function useProviderManager() {
  const [state, setState] = useState<ProviderManagerState>({
    providerStates: [],
    providerOrder: DEFAULT_PROVIDER_ORDER,
    isLoaded: false
  })

  /** Load all provider state from the main process on mount. */
  const loadProviderState = useCallback(async () => {
    try {
      const [store, savedProviders] = await Promise.all([
        window.electronAPI.getStore(),
        window.electronAPI.getAllSavedProviders()
      ])

      const providerOrder: string[] = (store?.providerOrder as string[] | undefined) ?? DEFAULT_PROVIDER_ORDER
      const modelPreferences: Record<string, string> = (store?.modelPreferences as Record<string, string> | undefined) ?? {}
      const savedSet = new Set<string>(savedProviders ?? [])

      const sortedAdapters = getProvidersSortedByOrder(providerOrder)

      const providerStates: ProviderState[] = sortedAdapters.map((adapter, idx) => ({
        adapter,
        keySaved: savedSet.has(adapter.config.id),
        selectedModel: modelPreferences[adapter.config.id] ?? adapter.config.defaultModel,
        priorityIndex: idx
      }))

      setState({ providerStates, providerOrder, isLoaded: true })
    } catch (err) {
      console.error("useProviderManager: failed to load state", err)
      // Fallback: build state with no keys saved
      const providerStates: ProviderState[] = DEFAULT_PROVIDER_ORDER.map((id, idx) => ({
        adapter: PROVIDER_REGISTRY[id],
        keySaved: false,
        selectedModel: PROVIDER_REGISTRY[id].config.defaultModel,
        priorityIndex: idx
      }))
      setState({ providerStates, providerOrder: DEFAULT_PROVIDER_ORDER, isLoaded: true })
    }
  }, [])

  useEffect(() => {
    loadProviderState()
  }, [loadProviderState])

  /** Refresh only the keySaved flags (call after saving/deleting a key). */
  const refreshKeyStatus = useCallback(async () => {
    try {
      const savedProviders = await window.electronAPI.getAllSavedProviders()
      const savedSet = new Set<string>(savedProviders ?? [])
      setState(prev => ({
        ...prev,
        providerStates: prev.providerStates.map(ps => ({
          ...ps,
          keySaved: savedSet.has(ps.adapter.config.id)
        }))
      }))
    } catch (err) {
      console.error("useProviderManager: refreshKeyStatus failed", err)
    }
  }, [])

  /** Reorder providers and persist. */
  const reorderProviders = useCallback(async (newOrder: string[]) => {
    await window.electronAPI.setStoreValue("providerOrder", newOrder)
    setState(prev => {
      const sortedAdapters = getProvidersSortedByOrder(newOrder)
      const modelPrefs = Object.fromEntries(
        prev.providerStates.map(ps => [ps.adapter.config.id, ps.selectedModel])
      )
      const savedSet = new Set(prev.providerStates.filter(ps => ps.keySaved).map(ps => ps.adapter.config.id))
      return {
        ...prev,
        providerOrder: newOrder,
        providerStates: sortedAdapters.map((adapter, idx) => ({
          adapter,
          keySaved: savedSet.has(adapter.config.id),
          selectedModel: modelPrefs[adapter.config.id] ?? adapter.config.defaultModel,
          priorityIndex: idx
        }))
      }
    })
  }, [])

  /** Reset to the default provider priority order. */
  const resetToDefaultOrder = useCallback(() => {
    reorderProviders([...DEFAULT_PROVIDER_ORDER])
  }, [reorderProviders])

  /** Update the selected model for a provider and persist. */
  const setModelForProvider = useCallback(async (providerId: string, model: string) => {
    setState(prev => {
      const updatedPrefs = Object.fromEntries(
        prev.providerStates.map(ps => [ps.adapter.config.id, ps.selectedModel])
      )
      updatedPrefs[providerId] = model
      window.electronAPI.setStoreValue("modelPreferences", updatedPrefs)
      return {
        ...prev,
        providerStates: prev.providerStates.map(ps =>
          ps.adapter.config.id === providerId ? { ...ps, selectedModel: model } : ps
        )
      }
    })
  }, [])

  /** Auto-arrange: tested working first, then saved-untested, then unsaved. */
  const autoArrangeProviders = useCallback(() => {
    setState(prev => {
      // We can't know "tested" status from this hook alone, so use keySaved as proxy
      const withKey = prev.providerStates.filter(ps => ps.keySaved).map(ps => ps.adapter.config.id)
      const withoutKey = prev.providerStates.filter(ps => !ps.keySaved).map(ps => ps.adapter.config.id)
      const newOrder = [...withKey, ...withoutKey]
      reorderProviders(newOrder)
      return prev
    })
  }, [reorderProviders])

  // ── Derived state ──────────────────────────────────────────────────────────

  /** Highest-priority provider that has a key saved AND supports vision for its selected model. */
  const activeVisionProvider: ProviderState | null =
    state.providerStates.find(ps =>
      ps.keySaved && adapterSupportsVision(ps.adapter, ps.selectedModel)
    ) ?? null

  /** Highest-priority provider that has a key saved (any modality). */
  const activeTextProvider: ProviderState | null =
    state.providerStates.find(ps => ps.keySaved) ?? null

  return {
    providerStates: state.providerStates,
    providerOrder: state.providerOrder,
    isLoaded: state.isLoaded,
    activeVisionProvider,
    activeTextProvider,
    reorderProviders,
    resetToDefaultOrder,
    setModelForProvider,
    autoArrangeProviders,
    refreshKeyStatus,
    reload: loadProviderState
  }
}
