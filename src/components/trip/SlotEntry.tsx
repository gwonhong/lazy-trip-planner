import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatTimeRange } from '../../lib/utils'
import type { Slot } from '../../types'

interface Props {
  slot: Slot
  isActive: boolean
  onSelect: () => void
}

export default function SlotEntry({ slot, isActive, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slot.id })
  const timeLabel = formatTimeRange(slot.startTime, slot.endTime)

  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`mx-1.5 mb-0.5 rounded px-2 py-1.5 flex items-center gap-2 cursor-pointer transition-colors ${
        isActive ? 'bg-indigo-600' : 'hover:bg-slate-700'
      }`}
    >
      <span
        {...attributes}
        {...listeners}
        className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing text-sm select-none"
        onClick={(e) => e.stopPropagation()}
      >
        ⠿
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
          {slot.title}
        </div>
        {timeLabel && (
          <div className={`text-xs ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
            {timeLabel}
          </div>
        )}
      </div>
    </div>
  )
}
