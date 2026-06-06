import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTripStore } from '../../stores/tripStore'
import { formatDateLabel, groupSlotsByDate } from '../../lib/utils'
import SlotEntry from './SlotEntry'

interface Props { tripId: string }

export default function DateSidebar({ tripId }: Props) {
  const { trips, activeSlotId, setActiveSlot, addSlot, reorderSlotsWithinDay } = useTripStore()
  const trip = trips.find((t) => t.id === tripId)!
  const [showNewForm, setShowNewForm] = useState(false)
  const [newDate, setNewDate] = useState(trip.startDate)
  const [newTitle, setNewTitle] = useState('')

  const grouped = groupSlotsByDate(trip.slots)
  const sensors = useSensors(useSensor(PointerSensor))

  function handleDragEnd(event: DragEndEvent, date: string, slots: typeof trip.slots) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = slots.map((s) => s.id)
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    const reordered = [...ids]
    reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, active.id as string)
    reorderSlotsWithinDay(tripId, date, reordered)
  }

  function handleAddSlot() {
    if (!newTitle.trim()) return
    const id = addSlot(tripId, { date: newDate, title: newTitle.trim() })
    setActiveSlot(id)
    setNewTitle('')
    setShowNewForm(false)
  }

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col overflow-y-auto py-2">
      {[...grouped.entries()].map(([date, slots]) => (
        <div key={date} className="mb-1">
          <div className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {formatDateLabel(date)}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, date, slots)}
          >
            <SortableContext items={slots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {slots.map((slot) => (
                <SlotEntry
                  key={slot.id}
                  slot={slot}
                  isActive={activeSlotId === slot.id}
                  onSelect={() => setActiveSlot(slot.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      ))}

      {showNewForm ? (
        <div className="mx-2 mt-2 flex flex-col gap-2">
          <input
            type="date"
            min={trip.startDate}
            max={trip.endDate}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-xs"
          />
          <input
            placeholder="Slot title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSlot()}
            autoFocus
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-xs placeholder:text-slate-500"
          />
          <div className="flex gap-1">
            <button onClick={handleAddSlot} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded px-2 py-1 text-xs">Add</button>
            <button onClick={() => setShowNewForm(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded px-2 py-1 text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewForm(true)}
          className="mx-2 mt-2 border border-dashed border-slate-700 hover:border-slate-500 rounded px-2 py-1.5 text-slate-500 hover:text-slate-400 text-xs text-center transition-colors"
        >
          + new slot
        </button>
      )}
    </div>
  )
}
