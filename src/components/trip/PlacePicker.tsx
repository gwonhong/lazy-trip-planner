import type { Place } from '../../types'

interface Props {
  places: Place[]
  onPick: (place: Place, target: 'plan' | 'maybe') => void
  onDismiss: () => void
}

export default function PlacePicker({ places, onPick, onDismiss }: Props) {
  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-[480px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {places.length} results — pick one
        </span>
        <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 text-sm">✕</button>
      </div>
      <div className="overflow-y-auto max-h-72">
        {places.map((place, i) => (
          <div key={place.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 border-b border-slate-800/50 last:border-0">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-100 truncate">{place.name}</div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => onPick(place, 'plan')}
                className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-2 py-1 rounded"
              >
                + Plan
              </button>
              <button
                onClick={() => onPick(place, 'maybe')}
                className="text-xs bg-emerald-900 hover:bg-emerald-800 text-emerald-300 px-2 py-1 rounded"
              >
                + Maybe
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
