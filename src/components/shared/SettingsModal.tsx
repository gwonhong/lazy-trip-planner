import Modal from './Modal'
import { useSettingsStore } from '../../stores/settingsStore'
import type { LlmProvider } from '../../types'

const PROVIDERS: { value: LlmProvider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT-4o)' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'ollama', label: 'Ollama (local)' },
]

interface Props { onClose: () => void }

export default function SettingsModal({ onClose }: Props) {
  const { googleMapsApiKey, llmProvider, apiKeys, updateSetting } = useSettingsStore()

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
