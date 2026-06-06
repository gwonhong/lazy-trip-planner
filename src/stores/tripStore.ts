import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Trip, Slot, Snapshot } from '../types'
import { uuid } from '../lib/utils'

interface TripState {
  trips: Trip[]
  activeTripId: string | null
  activeSlotId: string | null
  llmScope: 'slot' | 'trip'
  createTrip: (data: Pick<Trip, 'title' | 'destination' | 'startDate' | 'endDate'>) => string
  deleteTrip: (id: string) => void
  setActiveSlot: (slotId: string | null) => void
  updateSlot: (slotId: string, patch: Partial<Slot>) => void
  reorderSlotsWithinDay: (tripId: string, date: string, orderedIds: string[]) => void
  saveSnapshot: (tripId: string, label: string, isManual: boolean, commentary?: string) => void
  revertToSnapshot: (tripId: string, snapshotId: string) => void
  toggleLlmScope: () => void
  addSlot: (tripId: string, data: Pick<Slot, 'date' | 'title'>) => string
  deleteSlot: (tripId: string, slotId: string) => void
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      activeTripId: null,
      activeSlotId: null,
      llmScope: 'slot',

      createTrip: (data) => {
        const id = uuid()
        set((s) => ({
          trips: [...s.trips, { id, ...data, createdAt: new Date().toISOString(), slots: [], snapshots: [] }],
        }))
        return id
      },

      deleteTrip: (id) =>
        set((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),

      setActiveSlot: (slotId) => set({ activeSlotId: slotId }),

      updateSlot: (slotId, patch) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== s.activeTripId ? t : {
              ...t,
              slots: t.slots.map((sl) => sl.id === slotId ? { ...sl, ...patch } : sl),
            }
          ),
        })),

      reorderSlotsWithinDay: (tripId, date, orderedIds) =>
        set((s) => ({
          trips: s.trips.map((t) => {
            if (t.id !== tripId) return t
            return {
              ...t,
              slots: t.slots.map((sl) => {
                if (sl.date !== date) return sl
                const newOrder = orderedIds.indexOf(sl.id)
                return newOrder === -1 ? sl : { ...sl, order: newOrder }
              }),
            }
          }),
        })),

      saveSnapshot: (tripId, label, isManual, commentary) => {
        const trip = get().trips.find((t) => t.id === tripId)
        if (!trip) return
        const snapshot: Snapshot = {
          id: uuid(),
          createdAt: new Date().toISOString(),
          label,
          summary: label,
          commentary,
          isManual,
          slotsSnapshot: JSON.parse(JSON.stringify(trip.slots)),
        }
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId ? t : { ...t, snapshots: [snapshot, ...t.snapshots] }
          ),
        }))
      },

      revertToSnapshot: (tripId, snapshotId) => {
        const trip = get().trips.find((t) => t.id === tripId)
        if (!trip) return
        const snapshot = trip.snapshots.find((s) => s.id === snapshotId)
        if (!snapshot) return
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId ? t : { ...t, slots: JSON.parse(JSON.stringify(snapshot.slotsSnapshot)) }
          ),
        }))
      },

      toggleLlmScope: () =>
        set((s) => ({ llmScope: s.llmScope === 'slot' ? 'trip' : 'slot' })),

      addSlot: (tripId, data) => {
        const id = uuid()
        set((s) => ({
          trips: s.trips.map((t) => {
            if (t.id !== tripId) return t
            const order = t.slots.filter((sl) => sl.date === data.date).length
            return {
              ...t,
              slots: [...t.slots, { id, ...data, order, places: [], maybes: [] }],
            }
          }),
        }))
        return id
      },

      deleteSlot: (tripId, slotId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId ? t : { ...t, slots: t.slots.filter((sl) => sl.id !== slotId) }
          ),
          activeSlotId: s.activeSlotId === slotId ? null : s.activeSlotId,
        })),
    }),
    { name: 'lazy-trip-planner-trips' }
  )
)
