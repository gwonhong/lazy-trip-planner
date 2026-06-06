import { describe, it, expect, beforeEach } from 'vitest'
import { useTripStore } from '../../stores/tripStore'

beforeEach(() => {
  useTripStore.setState({
    trips: [], activeTripId: null, activeSlotId: null, llmScope: 'slot',
  })
})

describe('createTrip', () => {
  it('adds a trip and returns its id', () => {
    const id = useTripStore.getState().createTrip({
      title: 'Seoul', destination: 'Seoul, Korea',
      startDate: '2025-06-10', endDate: '2025-06-14',
    })
    expect(useTripStore.getState().trips).toHaveLength(1)
    expect(useTripStore.getState().trips[0].id).toBe(id)
  })
})

describe('deleteTrip', () => {
  it('removes the trip', () => {
    const id = useTripStore.getState().createTrip({
      title: 'Seoul', destination: 'Seoul', startDate: '2025-06-10', endDate: '2025-06-14',
    })
    useTripStore.getState().deleteTrip(id)
    expect(useTripStore.getState().trips).toHaveLength(0)
  })
})

describe('addSlot / updateSlot', () => {
  it('adds a slot to a trip and updates it', () => {
    const tripId = useTripStore.getState().createTrip({
      title: 'Seoul', destination: 'Seoul', startDate: '2025-06-10', endDate: '2025-06-14',
    })
    useTripStore.setState({ activeTripId: tripId })
    const slotId = useTripStore.getState().addSlot(tripId, { date: '2025-06-10', title: 'Morning' })
    useTripStore.getState().updateSlot(slotId, { title: 'City tour' })
    const slot = useTripStore.getState().trips[0].slots[0]
    expect(slot.title).toBe('City tour')
  })
})

describe('saveSnapshot / revertToSnapshot', () => {
  it('saves and reverts to a snapshot', () => {
    const tripId = useTripStore.getState().createTrip({
      title: 'Seoul', destination: 'Seoul', startDate: '2025-06-10', endDate: '2025-06-14',
    })
    useTripStore.setState({ activeTripId: tripId })
    useTripStore.getState().addSlot(tripId, { date: '2025-06-10', title: 'Morning' })
    useTripStore.getState().saveSnapshot(tripId, 'before change', true)
    useTripStore.getState().updateSlot(
      useTripStore.getState().trips[0].slots[0].id,
      { title: 'Changed' }
    )
    const snapshotId = useTripStore.getState().trips[0].snapshots[0].id
    useTripStore.getState().revertToSnapshot(tripId, snapshotId)
    expect(useTripStore.getState().trips[0].slots[0].title).toBe('Morning')
  })
})

describe('reorderSlotsWithinDay', () => {
  it('reorders slots within a day by new id order', () => {
    const tripId = useTripStore.getState().createTrip({
      title: 'Seoul', destination: 'Seoul', startDate: '2025-06-10', endDate: '2025-06-14',
    })
    useTripStore.setState({ activeTripId: tripId })
    const a = useTripStore.getState().addSlot(tripId, { date: '2025-06-10', title: 'A' })
    const b = useTripStore.getState().addSlot(tripId, { date: '2025-06-10', title: 'B' })
    useTripStore.getState().reorderSlotsWithinDay(tripId, '2025-06-10', [b, a])
    const slots = useTripStore.getState().trips[0].slots.filter(s => s.date === '2025-06-10')
    const sorted = [...slots].sort((x, y) => x.order - y.order)
    expect(sorted.map(s => s.id)).toEqual([b, a])
  })
})

describe('toggleLlmScope', () => {
  it('toggles between slot and trip', () => {
    expect(useTripStore.getState().llmScope).toBe('slot')
    useTripStore.getState().toggleLlmScope()
    expect(useTripStore.getState().llmScope).toBe('trip')
    useTripStore.getState().toggleLlmScope()
    expect(useTripStore.getState().llmScope).toBe('slot')
  })
})
