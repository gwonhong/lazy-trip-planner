import type { Place, Slot } from '../../types'

interface Props {
  slot: Slot
  onUpdate: (patch: Partial<Slot>) => void
}

export default function MaybePool({ slot, onUpdate }: Props) {
  function promoteToPlan(placeId: string) {
    const place = slot.maybes.find((p) => p.id === placeId)!
    onUpdate({
      maybes: slot.maybes.filter((p) => p.id !== placeId),
      places: [...slot.places, place],
    })
  }

  function remove(placeId: string) {
    onUpdate({ maybes: slot.maybes.filter((p) => p.id !== placeId) })
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {slot.maybes.map((place) => (
          <div key={place.id} className="flex items-center gap-1 bg-emerald-950 border border-emerald-800 rounded-full px-2.5 py-1 group">
            <span className="text-emerald-300 text-xs">{place.name}</span>
            <button onClick={() => promoteToPlan(place.id)} title="Move to plan" className="text-emerald-600 hover:text-emerald-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity">↑</button>
            <button onClick={() => remove(place.id)} title="Remove" className="text-emerald-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
          </div>
        ))}
        {slot.maybes.length === 0 && (
          <span className="text-slate-600 text-xs">No maybe places yet</span>
        )}
      </div>
    </div>
  )
}
