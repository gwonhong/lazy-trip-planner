import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Place, Slot } from '../../types'

interface PlaceRowProps {
  place: Place
  index: number
  onMoveToMaybe: () => void
  onRemove: () => void
}

function PlaceRow({ place, index, onMoveToMaybe, onRemove }: PlaceRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: place.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 mb-1.5 group">
      <span {...attributes} {...listeners} className="text-slate-600 hover:text-slate-400 cursor-grab text-sm select-none">⠿</span>
      <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 bg-slate-800 rounded px-2.5 py-1.5 text-sm text-slate-200 flex items-center justify-between">
        <span className="truncate">{place.name}</span>
        {place.estimatedDuration && (
          <span className="text-slate-500 text-xs ml-2 flex-shrink-0">~{Math.round(place.estimatedDuration / 60 * 10) / 10}h</span>
        )}
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        <button onClick={onMoveToMaybe} title="Move to maybe" className="text-slate-500 hover:text-yellow-400 text-xs">→?</button>
        <button onClick={onRemove} title="Remove" className="text-slate-500 hover:text-red-400 text-xs">✕</button>
      </div>
    </div>
  )
}

interface Props {
  slot: Slot
  onUpdate: (patch: Partial<Slot>) => void
  onFocusSearch: () => void
}

export default function PlaceList({ slot, onUpdate, onFocusSearch }: Props) {
  const sensors = useSensors(useSensor(PointerSensor))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = slot.places.map((p) => p.id)
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    const reordered = [...slot.places]
    reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, slot.places[oldIndex])
    onUpdate({ places: reordered })
  }

  function moveToMaybe(placeId: string) {
    const place = slot.places.find((p) => p.id === placeId)!
    onUpdate({
      places: slot.places.filter((p) => p.id !== placeId),
      maybes: [...slot.maybes, place],
    })
  }

  function remove(placeId: string) {
    onUpdate({ places: slot.places.filter((p) => p.id !== placeId) })
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slot.places.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {slot.places.map((place, i) => (
            <PlaceRow
              key={place.id}
              place={place}
              index={i}
              onMoveToMaybe={() => moveToMaybe(place.id)}
              onRemove={() => remove(place.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        onClick={onFocusSearch}
        className="flex items-center gap-2 w-full mt-1 mb-0 group"
      >
        <span className="w-5 h-5 border border-dashed border-slate-600 rounded-full flex items-center justify-center text-slate-600 group-hover:border-slate-400 text-xs">+</span>
        <span className="flex-1 border border-dashed border-slate-700 group-hover:border-slate-500 rounded px-2.5 py-1.5 text-xs text-slate-600 group-hover:text-slate-400 text-left transition-colors">
          add place…
        </span>
      </button>
    </div>
  )
}
