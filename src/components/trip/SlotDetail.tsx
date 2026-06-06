import { useTripStore } from '../../stores/tripStore'
import PlaceList from './PlaceList'
import MaybePool from './MaybePool'
import type { Slot } from '../../types'

interface Props {
  tripId: string
  slot: Slot
  onFocusSearch: () => void
}

export default function SlotDetail({ tripId, slot, onFocusSearch }: Props) {
  const updateSlot = useTripStore((s) => s.updateSlot)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Slot header */}
      <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="text-sm font-semibold text-slate-100">{slot.title}</div>
        <div className="text-xs text-slate-500">{slot.date}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {/* Ordered plan */}
        <section>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">📋 Plan</div>
          <PlaceList
            slot={slot}
            onUpdate={(patch) => updateSlot(slot.id, patch)}
            onFocusSearch={onFocusSearch}
          />
        </section>

        <div className="border-t border-dashed border-slate-800" />

        {/* Maybe pool */}
        <section>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">🗂 Maybe</div>
          <MaybePool slot={slot} onUpdate={(patch) => updateSlot(slot.id, patch)} />
        </section>
      </div>
    </div>
  )
}
