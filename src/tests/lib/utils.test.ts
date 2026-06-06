import { describe, it, expect } from 'vitest'
import { uuid, formatDateLabel, formatTimeRange, groupSlotsByDate } from '../../lib/utils'
import type { Slot } from '../../types'

describe('uuid', () => {
  it('returns a non-empty string', () => {
    expect(typeof uuid()).toBe('string')
    expect(uuid().length).toBeGreaterThan(0)
  })
  it('returns unique values', () => {
    expect(uuid()).not.toBe(uuid())
  })
})

describe('formatDateLabel', () => {
  it('formats YYYY-MM-DD to "Mon DD · Weekday"', () => {
    expect(formatDateLabel('2025-06-10')).toBe('Jun 10 · Tue')
  })
})

describe('formatTimeRange', () => {
  it('returns null when both are undefined', () => {
    expect(formatTimeRange()).toBeNull()
  })
  it('returns combined range when both provided', () => {
    expect(formatTimeRange('09:00', '13:00')).toBe('09:00–13:00')
  })
  it('returns start only when end is missing', () => {
    expect(formatTimeRange('09:00')).toBe('09:00')
  })
})

describe('groupSlotsByDate', () => {
  const slots: Slot[] = [
    { id: 'b', date: '2025-06-10', title: 'Night', order: 1, places: [], maybes: [] },
    { id: 'a', date: '2025-06-10', title: 'Day', order: 0, places: [], maybes: [] },
    { id: 'c', date: '2025-06-11', title: 'Morning', order: 0, places: [], maybes: [] },
  ]

  it('groups by date', () => {
    const map = groupSlotsByDate(slots)
    expect([...map.keys()]).toEqual(['2025-06-10', '2025-06-11'])
  })

  it('sorts within a date by order', () => {
    const map = groupSlotsByDate(slots)
    expect(map.get('2025-06-10')!.map((s) => s.id)).toEqual(['a', 'b'])
  })
})
