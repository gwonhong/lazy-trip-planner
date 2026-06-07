import Modal from './Modal'
import { useSettingsStore } from '../../stores/settingsStore'
import type { LlmProvider } from '../../types'

const PROVIDERS: { value: LlmProvider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'ollama', label: 'Ollama (local)' },
]

const MODELS: Record<LlmProvider, { value: string; label: string }[]> = {
  anthropic: [
    { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 — $5/$25 per 1M' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — $3/$15 per 1M' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — $1/$5 per 1M' },
  ],
  openai: [
    { value: 'gpt-5.4-pro', label: 'GPT-5.4 Pro — $30/$180 per 1M' },
    { value: 'gpt-5.5', label: 'GPT-5.5 — $5/$30 per 1M' },
    { value: 'gpt-5.4', label: 'GPT-5.4 — $2.50/$15 per 1M' },
    { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini — $0.75/$4.50 per 1M' },
    { value: 'gpt-5.4-nano', label: 'GPT-5.4 nano — $0.20/$1.25 per 1M' },
  ],
  gemini: [
    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview — $2/$12 per 1M' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — $1.25/$10 per 1M' },
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash — $1.50/$9 per 1M' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — $0.30/$2.50 per 1M' },
    { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite — $0.25/$1.50 per 1M' },
  ],
  ollama: [],
}

interface Props { onClose: () => void }

export default function SettingsModal({ onClose }: Props) {
  const { googleMapsApiKey, llmProvider, apiKeys, models, updateSetting } = useSettingsStore()

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Map</h3>
          <label className="block text-sm text-slate-300 mb-1">Google Maps API Key</label>
          <input
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500"
            placeholder="AIza..."
            value={googleMapsApiKey}
            onChange={(e) => updateSetting('googleMapsApiKey', e.target.value)}
          />
          <a
            href="https://mapsplatform.google.com/maps-demo-key/"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 hover:text-indigo-300 text-xs mt-1 inline-block"
          >
            Get a key →
          </a>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">AI</h3>
          <label className="block text-sm text-slate-300 mb-1">Provider</label>
          <select
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm mb-3"
            value={llmProvider}
            onChange={(e) => updateSetting('llmProvider', e.target.value as LlmProvider)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <label className="block text-sm text-slate-300 mb-1">Model</label>
          {llmProvider === 'ollama' ? (
            <input
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500 mb-3"
              placeholder="e.g. llama3.1, mistral, qwen2.5"
              value={models[llmProvider]}
              onChange={(e) => updateSetting('models', { ...models, [llmProvider]: e.target.value })}
            />
          ) : (
            <select
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm mb-3"
              value={models[llmProvider]}
              onChange={(e) => updateSetting('models', { ...models, [llmProvider]: e.target.value })}
            >
              {MODELS[llmProvider].map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          )}

          {llmProvider !== 'ollama' && (
            <>
              <label className="block text-sm text-slate-300 mb-1">API Key</label>
              <input
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500"
                placeholder={llmProvider === 'anthropic' ? 'sk-ant-...' : llmProvider === 'openai' ? 'sk-...' : 'AIza...'}
                value={apiKeys[llmProvider]}
                onChange={(e) =>
                  updateSetting('apiKeys', { ...apiKeys, [llmProvider]: e.target.value })
                }
              />
            </>
          )}
          {llmProvider === 'ollama' && (
            <p className="text-slate-500 text-xs">Ollama runs locally at http://localhost:11434 — no key needed.</p>
          )}
        </section>
      </div>
    </Modal>
  )
}
