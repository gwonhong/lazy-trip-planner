import type { Place } from '../../types'

interface Props {
  place: Place
  listType: 'plan' | 'maybe'
  onMoveToMaybe: () => void
  onMoveToPlan: () => void
  onRemove: () => void
  onClose: () => void
}

export default function PlacePinPopup({ place, listType, onMoveToMaybe, onMoveToPlan, onRemove, onClose }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 min-w-40 text-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-slate-100 font-medium text-xs leading-tight">{place.name}</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs flex-shrink-0">✕</button>
      </div>
      <div className="flex flex-col gap-1">
        {listType === 'plan' ? (
          <button onClick={onMoveToMaybe} className="text-left text-slate-400 hover:text-yellow-400 text-xs">→ Move to maybe</button>
        ) : (
          <button onClick={onMoveToPlan} className="text-left text-slate-400 hover:text-indigo-400 text-xs">↑ Move to plan</button>
        )}
        <button onClick={onRemove} className="text-left text-slate-400 hover:text-red-400 text-xs">✕ Remove</button>
      </div>
    </div>
  )
}
