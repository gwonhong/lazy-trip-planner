import { useTripStore } from '../../stores/tripStore'

export default function ScopeToggle() {
  const { llmScope, toggleLlmScope } = useTripStore()
  return (
    <button
      onClick={toggleLlmScope}
      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded-full transition-colors flex-shrink-0"
      title={llmScope === 'slot' ? 'Currently editing active slot only' : 'Currently editing all slots'}
    >
      {llmScope === 'slot' ? 'Slot' : 'Trip'}
    </button>
  )
}
