import type { Slot } from '../types'

export function uuid(): string {
  return crypto.randomUUID()
}

export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.toLocaleString('en', { month: 'short' })
  const day = d.getDate()
  const weekday = d.toLocaleString('en', { weekday: 'short' })
  return `${month} ${day} · ${weekday}`
}

export function formatTimeRange(start?: string, end?: string): string | null {
  if (!start && !end) return null
  if (start && end) return `${start}–${end}`
  return start ?? end ?? null
}

export function groupSlotsByDate(slots: Slot[]): Map<string, Slot[]> {
  const sorted = [...slots].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.order - b.order
  })
  const map = new Map<string, Slot[]>()
  for (const slot of sorted) {
    if (!map.has(slot.date)) map.set(slot.date, [])
    map.get(slot.date)!.push(slot)
  }
  return map
}
