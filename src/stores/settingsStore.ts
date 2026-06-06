import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '../types'

type SettingsState = Settings & {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      llmProvider: 'anthropic',
      apiKeys: { anthropic: '', openai: '', gemini: '', ollama: '' },
      googleMapsApiKey: '',
      updateSetting: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    { name: 'lazy-trip-planner-settings' }
  )
)
