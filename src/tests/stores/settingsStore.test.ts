import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../../stores/settingsStore'

beforeEach(() => {
  useSettingsStore.setState({
    llmProvider: 'anthropic',
    apiKeys: { anthropic: '', openai: '', gemini: '', ollama: '' },
    googleMapsApiKey: '',
  })
})

describe('updateSetting', () => {
  it('updates googleMapsApiKey', () => {
    useSettingsStore.getState().updateSetting('googleMapsApiKey', 'test-key')
    expect(useSettingsStore.getState().googleMapsApiKey).toBe('test-key')
  })

  it('updates llmProvider', () => {
    useSettingsStore.getState().updateSetting('llmProvider', 'openai')
    expect(useSettingsStore.getState().llmProvider).toBe('openai')
  })

  it('updates apiKeys', () => {
    useSettingsStore.getState().updateSetting('apiKeys', {
      anthropic: 'sk-ant', openai: '', gemini: '', ollama: '',
    })
    expect(useSettingsStore.getState().apiKeys.anthropic).toBe('sk-ant')
  })
})
