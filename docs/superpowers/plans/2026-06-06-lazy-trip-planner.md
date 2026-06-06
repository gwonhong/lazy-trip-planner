# Lazy Trip Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only flexible trip planner SPA with a trip card home page, three-panel trip planner (plan sidebar / Google Map / history), dual-mode command bar (Google Places search + multi-provider LLM planning), and snapshot-based undo history.

**Architecture:** Vite + React SPA with React Router v6 for home/trip routing. Zustand stores with `persist` middleware hold all state in localStorage. Google Maps JS API (loaded via `@googlemaps/js-api-loader`) renders the map and powers place search. A thin `LlmClient` abstraction wraps four providers behind one interface; all API calls go browser-to-provider with user-supplied keys.

**Tech Stack:** Vite 5, React 18, TypeScript 5, React Router v6, Zustand 4, Tailwind CSS 3, dnd-kit 6, @googlemaps/js-api-loader 1, Vitest 1, @testing-library/react 14, @testing-library/user-event 14

---

## File Map

```
src/
  main.tsx
  App.tsx
  types/index.ts                      ← all shared TypeScript types
  stores/
    tripStore.ts                      ← useTripStore
    settingsStore.ts                  ← useSettingsStore
  pages/
    HomePage.tsx
    TripPage.tsx
  components/
    home/
      TripGrid.tsx
      TripCard.tsx
      NewTripModal.tsx
    trip/
      DateSidebar.tsx
      SlotEntry.tsx
      SlotDetail.tsx
      PlaceList.tsx
      MaybePool.tsx
      MapPanel.tsx
      PlacePinPopup.tsx
      HistoryPanel.tsx
      SnapshotCard.tsx
      CollapseHandle.tsx
      CommandBar.tsx
      ModeToggle.tsx
      ScopeToggle.tsx
      CommentaryBubble.tsx
      PlacePicker.tsx
    shared/
      Modal.tsx
      SettingsModal.tsx
  lib/
    utils.ts
    maps/
      loader.ts
      placesSearch.ts
      searchPlacesTool.ts
    llm/
      index.ts
      anthropic.ts
      openai.ts
      gemini.ts
      ollama.ts
  tests/
    stores/
      tripStore.test.ts
      settingsStore.test.ts
    lib/
      utils.test.ts
      llm.test.ts
      placesSearch.test.ts
    components/
      TripCard.test.tsx
      SnapshotCard.test.tsx
      CommandBar.test.tsx
```

---

### Task 1: Project scaffold

**Files:**
- Create: project root (run in `/Users/gwonhong/development/projects/`)
- Create: `vite.config.ts`

Note: Tailwind CSS v4 uses a Vite plugin — no `tailwind.config.js` or `postcss.config.js` needed.

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Users/gwonhong/development/projects
pnpm create vite lazy-trip-planner --template react-ts
cd lazy-trip-planner
pnpm install
```

Expected: `node_modules/` created, dev server runnable.

- [ ] **Step 2: Install dependencies**

```bash
pnpm add react-router-dom zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @googlemaps/js-api-loader
pnpm add -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @types/google.maps
```

- [ ] **Step 3: Configure Tailwind v4**

Replace `src/index.css`:
```css
@import "tailwindcss";
```

No `tailwind.config.js` or `postcss.config.js` — Tailwind v4 is configured entirely through the Vite plugin and CSS.

- [ ] **Step 4: Configure Vite + Vitest**

Replace `vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
})
```

Create `src/tests/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create directory structure**

```bash
mkdir -p src/types src/stores src/pages src/components/home src/components/trip src/components/shared src/lib/maps src/lib/llm src/tests/stores src/tests/lib src/tests/components
```

- [ ] **Step 6: Verify dev server and test runner start**

```bash
pnpm dev        # should open http://localhost:5173
pnpm test       # should show 0 tests, no errors
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript project"
```

---

### Task 2: Core types and utilities

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/utils.ts`
- Create: `src/tests/lib/utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/lib/utils.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test utils
```
Expected: FAIL — `Cannot find module '../../lib/utils'`

- [ ] **Step 3: Create the types file**

Create `src/types/index.ts`:
```ts
export type LlmProvider = 'anthropic' | 'openai' | 'gemini' | 'ollama'

export type Settings = {
  llmProvider: LlmProvider
  apiKeys: { anthropic: string; openai: string; gemini: string; ollama: string }
  googleMapsApiKey: string
}

export type Place = {
  id: string
  name: string
  googlePlaceId?: string
  lat?: number
  lng?: number
  estimatedDuration?: number // minutes
}

export type Slot = {
  id: string
  date: string // YYYY-MM-DD
  title: string
  order: number
  startTime?: string // "09:00"
  endTime?: string   // "13:00"
  places: Place[]
  maybes: Place[]
}

export type Snapshot = {
  id: string
  createdAt: string
  label: string
  summary: string
  commentary?: string
  isManual: boolean
  slotsSnapshot: Slot[]
}

export type Trip = {
  id: string
  title: string
  destination: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  createdAt: string
  slots: Slot[]
  snapshots: Snapshot[]
}
```

- [ ] **Step 4: Create the utils file**

Create `src/lib/utils.ts`:
```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test utils
```
Expected: PASS — 6 tests passing

- [ ] **Step 6: Commit**

```bash
git add src/types src/lib/utils.ts src/tests/lib/utils.test.ts
git commit -m "feat: add core types and utility functions"
```

---

### Task 3: Zustand stores

**Files:**
- Create: `src/stores/tripStore.ts`
- Create: `src/stores/settingsStore.ts`
- Create: `src/tests/stores/tripStore.test.ts`
- Create: `src/tests/stores/settingsStore.test.ts`

- [ ] **Step 1: Write failing store tests**

Create `src/tests/stores/tripStore.test.ts`:
```ts
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
```

Create `src/tests/stores/settingsStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../../stores/settingsStore'

beforeEach(() => {
  useSettingsStore.setState({
    llmProvider: 'anthropic',
    apiKeys: { anthropic: '', openai: '', gemini: '', ollama: '' },
    googleMapsApiKey: '',
  })
})

describe('updateSetting', () => {
  it('updates googleMapsApiKey', () => {
    useSettingsStore.getState().updateSetting('googleMapsApiKey', 'test-key')
    expect(useSettingsStore.getState().googleMapsApiKey).toBe('test-key')
  })

  it('updates llmProvider', () => {
    useSettingsStore.getState().updateSetting('llmProvider', 'openai')
    expect(useSettingsStore.getState().llmProvider).toBe('openai')
  })

  it('updates apiKeys', () => {
    useSettingsStore.getState().updateSetting('apiKeys', {
      anthropic: 'sk-ant', openai: '', gemini: '', ollama: '',
    })
    expect(useSettingsStore.getState().apiKeys.anthropic).toBe('sk-ant')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test stores
```
Expected: FAIL — `Cannot find module '../../stores/tripStore'`

- [ ] **Step 3: Create tripStore**

Create `src/stores/tripStore.ts`:
```ts
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
```

- [ ] **Step 4: Create settingsStore**

Create `src/stores/settingsStore.ts`:
```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '../types'

type SettingsState = Settings & {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      llmProvider: 'anthropic',
      apiKeys: { anthropic: '', openai: '', gemini: '', ollama: '' },
      googleMapsApiKey: '',
      updateSetting: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    { name: 'lazy-trip-planner-settings' }
  )
)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test stores
```
Expected: PASS — all store tests passing

- [ ] **Step 6: Commit**

```bash
git add src/stores src/tests/stores
git commit -m "feat: add Zustand trip and settings stores with persistence"
```

---

### Task 4: App shell and routing

**Files:**
- Modify: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/TripPage.tsx`

- [ ] **Step 1: Update main.tsx**

Replace `src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

- [ ] **Step 2: Create App.tsx**

Create `src/App.tsx`:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import TripPage from './pages/TripPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/trip/:id" element={<TripPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 3: Create stub pages**

Create `src/pages/HomePage.tsx`:
```tsx
export default function HomePage() {
  return <div className="min-h-screen bg-slate-950 text-slate-100 p-8">Home</div>
}
```

Create `src/pages/TripPage.tsx`:
```tsx
import { useParams } from 'react-router-dom'

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  return <div className="min-h-screen bg-slate-950 text-slate-100 p-8">Trip: {id}</div>
}
```

- [ ] **Step 4: Verify routing works**

```bash
pnpm dev
```
Open `http://localhost:5173` — should show "Home". Open `http://localhost:5173/trip/test` — should show "Trip: test".

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/App.tsx src/pages
git commit -m "feat: add React Router shell with home and trip pages"
```

---

### Task 5: Home page

**Files:**
- Create: `src/components/shared/Modal.tsx`
- Create: `src/components/home/TripCard.tsx`
- Create: `src/components/home/NewTripModal.tsx`
- Create: `src/components/home/TripGrid.tsx`
- Modify: `src/pages/HomePage.tsx`
- Create: `src/tests/components/TripCard.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/tests/components/TripCard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TripCard from '../../components/home/TripCard'
import type { Trip } from '../../types'

const trip: Trip = {
  id: '1', title: 'Seoul Trip', destination: 'Seoul, Korea',
  startDate: '2025-06-10', endDate: '2025-06-14',
  createdAt: '2025-01-01T00:00:00Z', slots: [], snapshots: [],
}

describe('TripCard', () => {
  it('renders trip title and destination', () => {
    render(<TripCard trip={trip} onOpen={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Seoul Trip')).toBeInTheDocument()
    expect(screen.getByText('Seoul, Korea')).toBeInTheDocument()
  })

  it('calls onOpen when card is clicked', () => {
    const onOpen = vi.fn()
    render(<TripCard trip={trip} onOpen={onOpen} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByText('Seoul Trip'))
    expect(onOpen).toHaveBeenCalled()
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<TripCard trip={trip} onOpen={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test TripCard
```
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Create Modal**

Create `src/components/shared/Modal.tsx`:
```tsx
import { useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ title, onClose, children }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create TripCard**

Create `src/components/home/TripCard.tsx`:
```tsx
import type { Trip } from '../../types'

interface Props {
  trip: Trip
  onOpen: () => void
  onDelete: () => void
}

export default function TripCard({ trip, onOpen, onDelete }: Props) {
  return (
    <div
      onClick={onOpen}
      className="bg-slate-800 border border-slate-700 rounded-xl p-5 cursor-pointer hover:border-indigo-500 transition-colors group"
    >
      <h3 className="text-slate-100 font-semibold text-base mb-1">{trip.title}</h3>
      <p className="text-slate-400 text-sm mb-3">{trip.destination}</p>
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs">{trip.startDate} – {trip.endDate}</span>
        <button
          aria-label="Delete trip"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="text-slate-600 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create NewTripModal**

Create `src/components/home/NewTripModal.tsx`:
```tsx
import { useState } from 'react'
import Modal from '../shared/Modal'

interface Props {
  onClose: () => void
  onCreate: (data: { title: string; destination: string; startDate: string; endDate: string }) => void
}

export default function NewTripModal({ onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const valid = title && destination && startDate && endDate

  return (
    <Modal title="New Trip" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500"
          placeholder="Trip title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500"
          placeholder="Destination (e.g. Seoul, Korea)"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        <div className="flex gap-2">
          <input type="date" className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button
          disabled={!valid}
          onClick={() => valid && onCreate({ title, destination, startDate, endDate })}
          className="mt-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          Create Trip
        </button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 6: Create TripGrid**

Create `src/components/home/TripGrid.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import { useTripStore } from '../../stores/tripStore'
import TripCard from './TripCard'

export default function TripGrid() {
  const navigate = useNavigate()
  const { trips, deleteTrip } = useTripStore()

  if (trips.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-16">
        No trips yet. Create your first one.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {trips.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          onOpen={() => navigate(`/trip/${trip.id}`)}
          onDelete={() => deleteTrip(trip.id)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Update HomePage**

Replace `src/pages/HomePage.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TripGrid from '../components/home/TripGrid'
import NewTripModal from '../components/home/NewTripModal'
import { useTripStore } from '../stores/tripStore'

export default function HomePage() {
  const navigate = useNavigate()
  const createTrip = useTripStore((s) => s.createTrip)
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-800">
        <h1 className="text-xl font-bold text-slate-100">Lazy Trip Planner</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Trip
          </button>
        </div>
      </header>
      <main className="px-8 py-8">
        <TripGrid />
      </main>
      {showModal && (
        <NewTripModal
          onClose={() => setShowModal(false)}
          onCreate={(data) => {
            const id = createTrip(data)
            setShowModal(false)
            navigate(`/trip/${id}`)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 8: Run tests**

```bash
pnpm test TripCard
```
Expected: PASS — 3 tests passing

- [ ] **Step 9: Commit**

```bash
git add src/components/home src/components/shared/Modal.tsx src/pages/HomePage.tsx src/tests/components/TripCard.test.tsx
git commit -m "feat: add home page with trip card grid and new trip modal"
```

---

### Task 6: Settings modal

**Files:**
- Create: `src/components/shared/SettingsModal.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/TripPage.tsx`

- [ ] **Step 1: Create SettingsModal**

Create `src/components/shared/SettingsModal.tsx`:
```tsx
import Modal from './Modal'
import { useSettingsStore } from '../../stores/settingsStore'
import type { LlmProvider } from '../../types'

const PROVIDERS: { value: LlmProvider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT-4o)' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'ollama', label: 'Ollama (local)' },
]

interface Props { onClose: () => void }

export default function SettingsModal({ onClose }: Props) {
  const { googleMapsApiKey, llmProvider, apiKeys, updateSetting } = useSettingsStore()

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Map</h3>
          <label className="block text-sm text-slate-300 mb-1">Google Maps API Key</label>
          <input
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500"
            placeholder="AIza..."
            value={googleMapsApiKey}
            onChange={(e) => updateSetting('googleMapsApiKey', e.target.value)}
          />
          <a
            href="https://mapsplatform.google.com/maps-demo-key/"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 hover:text-indigo-300 text-xs mt-1 inline-block"
          >
            Get a key →
          </a>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">AI</h3>
          <label className="block text-sm text-slate-300 mb-1">Provider</label>
          <select
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm mb-3"
            value={llmProvider}
            onChange={(e) => updateSetting('llmProvider', e.target.value as LlmProvider)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          {llmProvider !== 'ollama' && (
            <>
              <label className="block text-sm text-slate-300 mb-1">API Key</label>
              <input
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500"
                placeholder={llmProvider === 'anthropic' ? 'sk-ant-...' : llmProvider === 'openai' ? 'sk-...' : 'AIza...'}
                value={apiKeys[llmProvider]}
                onChange={(e) =>
                  updateSetting('apiKeys', { ...apiKeys, [llmProvider]: e.target.value })
                }
              />
            </>
          )}
          {llmProvider === 'ollama' && (
            <p className="text-slate-500 text-xs">Ollama runs locally at http://localhost:11434 — no key needed.</p>
          )}
        </section>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Add settings gear to HomePage**

In `src/pages/HomePage.tsx`, update the header to include a gear icon that opens SettingsModal:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TripGrid from '../components/home/TripGrid'
import NewTripModal from '../components/home/NewTripModal'
import SettingsModal from '../components/shared/SettingsModal'
import { useTripStore } from '../stores/tripStore'

export default function HomePage() {
  const navigate = useNavigate()
  const createTrip = useTripStore((s) => s.createTrip)
  const [showNew, setShowNew] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-800">
        <h1 className="text-xl font-bold text-slate-100">Lazy Trip Planner</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowNew(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Trip
          </button>
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            className="text-slate-400 hover:text-slate-200 text-xl px-2"
          >
            ⚙
          </button>
        </div>
      </header>
      <main className="px-8 py-8"><TripGrid /></main>
      {showNew && (
        <NewTripModal
          onClose={() => setShowNew(false)}
          onCreate={(data) => { const id = createTrip(data); setShowNew(false); navigate(`/trip/${id}`) }}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
```

- [ ] **Step 3: Add settings gear to TripPage stub**

In `src/pages/TripPage.tsx`, add a settings button placeholder:
```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SettingsModal from '../components/shared/SettingsModal'

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 flex-shrink-0">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-200 text-sm">← Home</button>
        <button onClick={() => setShowSettings(true)} aria-label="Settings" className="text-slate-400 hover:text-slate-200 text-xl">⚙</button>
      </header>
      <div className="flex-1 flex items-center justify-center text-slate-500">
        Trip planner for {id} — coming soon
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
```

- [ ] **Step 4: Manually verify in browser**

```bash
pnpm dev
```
- Open home page → click ⚙ → settings modal opens
- Fill in Maps API key → it persists on refresh (localStorage)
- Select different LLM provider → API key field updates

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/SettingsModal.tsx src/pages/HomePage.tsx src/pages/TripPage.tsx
git commit -m "feat: add settings modal with Maps and LLM API key configuration"
```

---

### Task 7: Trip planner three-panel layout and CollapseHandle

**Files:**
- Create: `src/components/trip/CollapseHandle.tsx`
- Modify: `src/pages/TripPage.tsx`

- [ ] **Step 1: Create CollapseHandle**

Create `src/components/trip/CollapseHandle.tsx`:
```tsx
interface Props {
  collapsed: boolean
  onToggle: () => void
}

export default function CollapseHandle({ collapsed, onToggle }: Props) {
  return (
    <div className="relative z-10 flex items-center" style={{ marginLeft: -10, marginRight: -10 }}>
      <button
        onClick={onToggle}
        className="absolute top-1/2 -translate-y-1/2 w-5 h-9 bg-slate-700 border border-slate-600 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-600 flex items-center justify-center text-xs transition-colors"
        aria-label={collapsed ? 'Expand history' : 'Collapse history'}
      >
        {collapsed ? '‹' : '›'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Build the three-panel layout in TripPage**

Replace `src/pages/TripPage.tsx`:
```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTripStore } from '../stores/tripStore'
import SettingsModal from '../components/shared/SettingsModal'
import CollapseHandle from '../components/trip/CollapseHandle'

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const trip = useTripStore((s) => s.trips.find((t) => t.id === id))
  const [historyCollapsed, setHistoryCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Trip not found.</p>
          <button onClick={() => navigate('/')} className="text-indigo-400 hover:text-indigo-300 text-sm">← Back to home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-200 text-sm">← Home</button>
          <span className="text-slate-600">|</span>
          <span className="text-slate-200 font-medium text-sm">{trip.title}</span>
        </div>
        <button onClick={() => setShowSettings(true)} aria-label="Settings" className="text-slate-400 hover:text-slate-200 text-xl">⚙</button>
      </header>

      {/* Three-panel body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left panel: date sidebar + slot detail */}
        <div className="w-72 flex-shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
            Date sidebar — Task 8
          </div>
        </div>

        {/* Middle panel: map */}
        <div className="flex-1 relative overflow-hidden">
          <div className="h-full flex items-center justify-center text-slate-600 text-sm">
            Map panel — Task 11
          </div>
        </div>

        {/* Collapse handle on the map/history divider */}
        <CollapseHandle
          collapsed={historyCollapsed}
          onToggle={() => setHistoryCollapsed((v) => !v)}
        />

        {/* Right panel: history */}
        {!historyCollapsed && (
          <div className="w-56 flex-shrink-0 border-l border-slate-800 flex flex-col overflow-hidden">
            <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
              History — Task 10
            </div>
          </div>
        )}
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

```bash
pnpm dev
```
- Create a trip → opens trip page with three-panel shell
- Click `›` handle → history panel collapses; click `‹` → expands

- [ ] **Step 4: Commit**

```bash
git add src/components/trip/CollapseHandle.tsx src/pages/TripPage.tsx
git commit -m "feat: add three-panel trip planner layout with collapsible history"
```

---

### Task 8: Date sidebar with drag-reorder

**Files:**
- Create: `src/components/trip/SlotEntry.tsx`
- Create: `src/components/trip/DateSidebar.tsx`
- Modify: `src/pages/TripPage.tsx`

- [ ] **Step 1: Create SlotEntry**

Create `src/components/trip/SlotEntry.tsx`:
```tsx
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
```

- [ ] **Step 2: Create DateSidebar**

Create `src/components/trip/DateSidebar.tsx`:
```tsx
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
```

- [ ] **Step 3: Wire DateSidebar into TripPage left panel**

In `src/pages/TripPage.tsx`, replace the left panel placeholder:
```tsx
{/* Left panel */}
<div className="w-72 flex-shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
  <DateSidebar tripId={trip.id} />
</div>
```

Add import at the top:
```tsx
import DateSidebar from '../components/trip/DateSidebar'
```

- [ ] **Step 4: Verify in browser**

- Create a trip, open it
- Add slots with + new slot, verify they appear grouped by date
- Drag-reorder slots within the same date

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/SlotEntry.tsx src/components/trip/DateSidebar.tsx src/pages/TripPage.tsx
git commit -m "feat: add date sidebar with drag-reorder slots"
```

---

### Task 9: Slot detail with draggable places

**Files:**
- Create: `src/components/trip/PlaceList.tsx`
- Create: `src/components/trip/MaybePool.tsx`
- Create: `src/components/trip/SlotDetail.tsx`
- Modify: `src/pages/TripPage.tsx`

- [ ] **Step 1: Create PlaceList**

Create `src/components/trip/PlaceList.tsx`:
```tsx
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Place, Slot } from '../../types'
import { uuid } from '../../lib/utils'

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
```

- [ ] **Step 2: Create MaybePool**

Create `src/components/trip/MaybePool.tsx`:
```tsx
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
```

- [ ] **Step 3: Create SlotDetail**

Create `src/components/trip/SlotDetail.tsx`:
```tsx
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
```

- [ ] **Step 4: Wire SlotDetail into TripPage**

Update the left panel in `src/pages/TripPage.tsx` to show either a slot detail or a prompt:

```tsx
import DateSidebar from '../components/trip/DateSidebar'
import SlotDetail from '../components/trip/SlotDetail'

// Inside the left panel div:
<div className="w-72 flex-shrink-0 border-r border-slate-800 flex overflow-hidden">
  {/* Date sidebar takes ~40% width */}
  <div className="w-36 flex-shrink-0 border-r border-slate-800 overflow-hidden">
    <DateSidebar tripId={trip.id} />
  </div>
  {/* Slot detail takes remaining width */}
  <div className="flex-1 overflow-hidden">
    {activeSlot ? (
      <SlotDetail
        tripId={trip.id}
        slot={activeSlot}
        onFocusSearch={() => {/* wired in Task 13 */}}
      />
    ) : (
      <div className="h-full flex items-center justify-center text-slate-600 text-sm text-center px-4">
        Select a slot to see its plan
      </div>
    )}
  </div>
</div>
```

Add the `activeSlot` derivation near the top of TripPage:
```tsx
const activeSlotId = useTripStore((s) => s.activeSlotId)
const activeSlot = trip.slots.find((s) => s.id === activeSlotId) ?? null
```

Add import for `useTripStore`:
```tsx
import { useTripStore } from '../stores/tripStore'
```

- [ ] **Step 5: Verify in browser**

- Select a slot → detail panel shows plan and maybe pool
- Drag places to reorder
- Click → ? to move a plan place to maybe pool
- Click ↑ on a maybe chip to promote it back to plan

- [ ] **Step 6: Commit**

```bash
git add src/components/trip/PlaceList.tsx src/components/trip/MaybePool.tsx src/components/trip/SlotDetail.tsx src/pages/TripPage.tsx
git commit -m "feat: add slot detail with draggable place list and maybe pool"
```

---

### Task 10: History panel

**Files:**
- Create: `src/components/trip/SnapshotCard.tsx`
- Create: `src/components/trip/HistoryPanel.tsx`
- Modify: `src/pages/TripPage.tsx`
- Create: `src/tests/components/SnapshotCard.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/tests/components/SnapshotCard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SnapshotCard from '../../components/trip/SnapshotCard'
import type { Snapshot } from '../../types'

const snapshot: Snapshot = {
  id: '1', createdAt: '2025-06-10T09:32:00Z',
  label: 'optimize stops', summary: 'Reordered stops for efficiency',
  isManual: false, slotsSnapshot: [],
}

describe('SnapshotCard', () => {
  it('renders label and summary', () => {
    render(<SnapshotCard snapshot={snapshot} isLatest={false} onRevert={vi.fn()} />)
    expect(screen.getByText('optimize stops')).toBeInTheDocument()
    expect(screen.getByText('Reordered stops for efficiency')).toBeInTheDocument()
  })

  it('shows latest badge when isLatest is true', () => {
    render(<SnapshotCard snapshot={snapshot} isLatest={true} onRevert={vi.fn()} />)
    expect(screen.getByText('latest')).toBeInTheDocument()
  })

  it('calls onRevert when revert button is clicked', () => {
    const onRevert = vi.fn()
    render(<SnapshotCard snapshot={snapshot} isLatest={false} onRevert={onRevert} />)
    fireEvent.click(screen.getByRole('button', { name: /revert/i }))
    expect(onRevert).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
pnpm test SnapshotCard
```
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Create SnapshotCard**

Create `src/components/trip/SnapshotCard.tsx`:
```tsx
import type { Snapshot } from '../../types'

interface Props {
  snapshot: Snapshot
  isLatest: boolean
  onRevert: () => void
}

export default function SnapshotCard({ snapshot, isLatest, onRevert }: Props) {
  const time = new Date(snapshot.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`rounded-md border p-2.5 text-xs ${isLatest ? 'bg-slate-800 border-slate-600' : 'bg-slate-950 border-slate-800'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-500">{time}</span>
        <div className="flex items-center gap-1.5">
          {snapshot.isManual && (
            <span className="bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full text-xs">💾 manual</span>
          )}
          {isLatest ? (
            <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-xs">latest</span>
          ) : (
            <button
              aria-label="Revert to this snapshot"
              onClick={onRevert}
              className="border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded-full text-xs transition-colors"
            >
              ↩ revert
            </button>
          )}
        </div>
      </div>
      <p className="text-slate-200 mb-0.5 truncate">"{snapshot.label}"</p>
      <p className="text-slate-500 truncate">{snapshot.summary}</p>
      {snapshot.commentary && (
        <p className="text-slate-400 italic mt-1 text-xs leading-relaxed border-t border-slate-800 pt-1">
          {snapshot.commentary}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create HistoryPanel**

Create `src/components/trip/HistoryPanel.tsx`:
```tsx
import { useState } from 'react'
import { useTripStore } from '../../stores/tripStore'
import SnapshotCard from './SnapshotCard'
import Modal from '../shared/Modal'

interface Props { tripId: string }

export default function HistoryPanel({ tripId }: Props) {
  const { trips, saveSnapshot, revertToSnapshot } = useTripStore()
  const trip = trips.find((t) => t.id === tripId)!
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [label, setLabel] = useState('')

  function handleManualSave() {
    saveSnapshot(tripId, label || 'Manual save', true)
    setLabel('')
    setShowLabelModal(false)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 flex-shrink-0">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🕐 History</span>
        <button
          onClick={() => setShowLabelModal(true)}
          title="Save snapshot"
          className="text-slate-500 hover:text-slate-200 text-sm transition-colors"
        >
          💾
        </button>
      </div>

      {/* Snapshot list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {trip.snapshots.length === 0 && (
          <p className="text-slate-600 text-xs text-center py-6">
            No history yet.<br />AI edits and manual saves appear here.
          </p>
        )}
        {trip.snapshots.map((snapshot, i) => (
          <SnapshotCard
            key={snapshot.id}
            snapshot={snapshot}
            isLatest={i === 0}
            onRevert={() => revertToSnapshot(tripId, snapshot.id)}
          />
        ))}
      </div>

      {showLabelModal && (
        <Modal title="Save snapshot" onClose={() => setShowLabelModal(false)}>
          <div className="flex flex-col gap-3">
            <input
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSave()}
              autoFocus
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500"
            />
            <button
              onClick={handleManualSave}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-sm font-medium"
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Wire HistoryPanel into TripPage**

In `src/pages/TripPage.tsx`, replace the history placeholder with `<HistoryPanel tripId={trip.id} />`:
```tsx
import HistoryPanel from '../components/trip/HistoryPanel'

// ...

{!historyCollapsed && (
  <div className="w-56 flex-shrink-0 border-l border-slate-800 flex flex-col overflow-hidden">
    <HistoryPanel tripId={trip.id} />
  </div>
)}
```

- [ ] **Step 6: Run tests**

```bash
pnpm test SnapshotCard
```
Expected: PASS — 3 tests passing

- [ ] **Step 7: Commit**

```bash
git add src/components/trip/SnapshotCard.tsx src/components/trip/HistoryPanel.tsx src/pages/TripPage.tsx src/tests/components/SnapshotCard.test.tsx
git commit -m "feat: add history panel with snapshot cards and manual save"
```

---

### Task 11: Google Maps panel

**Files:**
- Create: `src/lib/maps/loader.ts`
- Create: `src/components/trip/PlacePinPopup.tsx`
- Create: `src/components/trip/MapPanel.tsx`
- Modify: `src/pages/TripPage.tsx`

- [ ] **Step 1: Create the Maps loader**

Create `src/lib/maps/loader.ts`:
```ts
import { Loader } from '@googlemaps/js-api-loader'

let loaderPromise: Promise<void> | null = null

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (!loaderPromise) {
    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['places'] })
    loaderPromise = loader.load()
  }
  return loaderPromise
}
```

Note: The Maps API is loaded once per session. If the user changes their API key in settings, a page reload is required to re-initialize the API.

- [ ] **Step 2: Create PlacePinPopup**

Create `src/components/trip/PlacePinPopup.tsx`:
```tsx
import type { Place, Slot } from '../../types'

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
```

- [ ] **Step 3: Create MapPanel**

Create `src/components/trip/MapPanel.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTripStore } from '../../stores/tripStore'
import { loadGoogleMaps } from '../../lib/maps/loader'
import PlacePinPopup from './PlacePinPopup'
import type { Place } from '../../types'

interface PopupState {
  place: Place
  listType: 'plan' | 'maybe'
  position: { x: number; y: number }
}

interface Props {
  tripId: string
  candidatePins?: Place[]
}

export default function MapPanel({ tripId, candidatePins }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const googleMapsApiKey = useSettingsStore((s) => s.googleMapsApiKey)
  const { trips, activeSlotId, updateSlot } = useTripStore()
  const trip = trips.find((t) => t.id === tripId)!
  const activeSlot = trip.slots.find((s) => s.id === activeSlotId)
  const [popup, setPopup] = useState<PopupState | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize map
  useEffect(() => {
    if (!googleMapsApiKey) { setError('No Google Maps API key. Configure it in ⚙ Settings.'); return }
    loadGoogleMaps(googleMapsApiKey)
      .then(() => {
        if (!mapRef.current || mapInstanceRef.current) return
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: { lat: 37.5665, lng: 126.978 }, // Seoul default
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          styles: [{ elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
                   { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
                   { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] }],
        })
      })
      .catch(() => setError('Failed to load Google Maps. Check your API key.'))
  }, [googleMapsApiKey])

  // Update markers whenever active slot or candidates change
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const pins = candidatePins ?? []
    const planPlaces = activeSlot?.places ?? []
    const maybePlaces = activeSlot?.maybes ?? []

    if (pins.length > 0) {
      // Candidate pins (numbered, orange)
      pins.forEach((place, i) => {
        if (!place.lat || !place.lng) return
        const marker = new google.maps.Marker({
          map,
          position: { lat: place.lat, lng: place.lng },
          label: { text: String(i + 1), color: 'white', fontSize: '11px', fontWeight: 'bold' },
          icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#f97316', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 10 },
        })
        markersRef.current.push(marker)
      })
    } else {
      // Plan pins (blue, numbered)
      planPlaces.forEach((place, i) => {
        if (!place.lat || !place.lng) return
        const marker = new google.maps.Marker({
          map,
          position: { lat: place.lat, lng: place.lng },
          label: { text: String(i + 1), color: 'white', fontSize: '11px', fontWeight: 'bold' },
          icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#6366f1', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 10 },
        })
        marker.addListener('click', (e: google.maps.MapMouseEvent) => {
          setPopup({ place, listType: 'plan', position: { x: e.domEvent.clientX, y: e.domEvent.clientY } })
        })
        markersRef.current.push(marker)
      })

      // Maybe pins (green, smaller)
      maybePlaces.forEach((place) => {
        if (!place.lat || !place.lng) return
        const marker = new google.maps.Marker({
          map,
          position: { lat: place.lat, lng: place.lng },
          icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#22c55e', fillOpacity: 0.8, strokeColor: '#fff', strokeWeight: 2, scale: 7 },
        })
        marker.addListener('click', (e: google.maps.MapMouseEvent) => {
          setPopup({ place, listType: 'maybe', position: { x: e.domEvent.clientX, y: e.domEvent.clientY } })
        })
        markersRef.current.push(marker)
      })
    }

    // Fit bounds to visible pins
    const allWithCoords = [...planPlaces, ...maybePlaces, ...pins].filter((p) => p.lat && p.lng)
    if (allWithCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      allWithCoords.forEach((p) => bounds.extend({ lat: p.lat!, lng: p.lng! }))
      map.fitBounds(bounds, 80)
    }
  }, [activeSlot, candidatePins])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-center px-6">
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="h-full w-full" />
      {popup && (
        <div
          className="fixed z-50"
          style={{ left: popup.position.x, top: popup.position.y, transform: 'translate(-50%, -110%)' }}
        >
          <PlacePinPopup
            place={popup.place}
            listType={popup.listType}
            onClose={() => setPopup(null)}
            onMoveToMaybe={() => {
              if (!activeSlot) return
              updateSlot(activeSlot.id, {
                places: activeSlot.places.filter((p) => p.id !== popup.place.id),
                maybes: [...activeSlot.maybes, popup.place],
              })
              setPopup(null)
            }}
            onMoveToPlan={() => {
              if (!activeSlot) return
              updateSlot(activeSlot.id, {
                maybes: activeSlot.maybes.filter((p) => p.id !== popup.place.id),
                places: [...activeSlot.places, popup.place],
              })
              setPopup(null)
            }}
            onRemove={() => {
              if (!activeSlot) return
              updateSlot(activeSlot.id, {
                places: activeSlot.places.filter((p) => p.id !== popup.place.id),
                maybes: activeSlot.maybes.filter((p) => p.id !== popup.place.id),
              })
              setPopup(null)
            }}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire MapPanel into TripPage**

In `src/pages/TripPage.tsx`:
```tsx
import MapPanel from '../components/trip/MapPanel'

// Replace map placeholder:
<div className="flex-1 relative overflow-hidden">
  <MapPanel tripId={trip.id} />
</div>
```

- [ ] **Step 5: Verify in browser**

Add a Google Maps API key in settings, open a trip, select a slot, add places (manually for now by editing store state or wait for Task 13). Verify map renders and pins appear.

- [ ] **Step 6: Commit**

```bash
git add src/lib/maps/loader.ts src/components/trip/MapPanel.tsx src/components/trip/PlacePinPopup.tsx src/pages/TripPage.tsx
git commit -m "feat: add Google Maps panel with plan and maybe pins"
```

---

### Task 12: Places search library

**Files:**
- Create: `src/lib/maps/placesSearch.ts`
- Create: `src/lib/maps/searchPlacesTool.ts`
- Create: `src/tests/lib/placesSearch.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tests/lib/placesSearch.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the google.maps namespace
const mockTextSearch = vi.fn()
const mockGetPredictions = vi.fn()
const mockGetDetails = vi.fn()

vi.stubGlobal('google', {
  maps: {
    places: {
      PlacesService: vi.fn(() => ({ textSearch: mockTextSearch, getDetails: mockGetDetails })),
      AutocompleteService: vi.fn(() => ({ getPlacePredictions: mockGetPredictions })),
      PlacesServiceStatus: { OK: 'OK', ZERO_RESULTS: 'ZERO_RESULTS' },
    },
    LatLng: vi.fn((lat: number, lng: number) => ({ lat: () => lat, lng: () => lng })),
  },
})

import { textSearchPlaces, autocompletePlaces, getPlaceDetails } from '../../lib/maps/placesSearch'

beforeEach(() => { vi.clearAllMocks() })

describe('textSearchPlaces', () => {
  it('returns mapped Place objects on OK status', async () => {
    mockTextSearch.mockImplementation((_req: unknown, cb: Function) => {
      cb([
        { place_id: 'p1', name: 'Ramen Shop', geometry: { location: { lat: () => 37.5, lng: () => 127.0 } } },
      ], 'OK')
    })
    const results = await textSearchPlaces('ramen near Bukchon', 'fake-key')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Ramen Shop')
    expect(results[0].googlePlaceId).toBe('p1')
    expect(results[0].lat).toBe(37.5)
  })

  it('throws on non-OK status', async () => {
    mockTextSearch.mockImplementation((_req: unknown, cb: Function) => cb(null, 'ZERO_RESULTS'))
    await expect(textSearchPlaces('nowhere', 'fake-key')).rejects.toThrow()
  })
})

describe('autocompletePlaces', () => {
  it('returns predictions on OK status', async () => {
    const predictions = [{ place_id: 'p1', description: 'Gyeongbokgung Palace', structured_formatting: { main_text: 'Gyeongbokgung' } }]
    mockGetPredictions.mockImplementation((_req: unknown, cb: Function) => cb(predictions, 'OK'))
    const results = await autocompletePlaces('Gyeong')
    expect(results).toHaveLength(1)
    expect(results[0].description).toBe('Gyeongbokgung Palace')
  })

  it('returns empty array on non-OK status', async () => {
    mockGetPredictions.mockImplementation((_req: unknown, cb: Function) => cb(null, 'ZERO_RESULTS'))
    const results = await autocompletePlaces('xyz')
    expect(results).toEqual([])
  })
})

describe('getPlaceDetails', () => {
  it('returns a Place with lat/lng', async () => {
    mockGetDetails.mockImplementation((_req: unknown, cb: Function) => {
      cb({ place_id: 'p1', name: 'Test Place', geometry: { location: { lat: () => 37.5, lng: () => 127.0 } } }, 'OK')
    })
    const place = await getPlaceDetails('p1')
    expect(place.name).toBe('Test Place')
    expect(place.lat).toBe(37.5)
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm test placesSearch
```
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Create placesSearch.ts**

Create `src/lib/maps/placesSearch.ts`:
```ts
import type { Place } from '../../types'
import { uuid } from '../utils'

let placesService: google.maps.places.PlacesService | null = null

function getPlacesService(): google.maps.places.PlacesService {
  if (!placesService) {
    placesService = new google.maps.places.PlacesService(document.createElement('div'))
  }
  return placesService
}

export function textSearchPlaces(query: string, _apiKey: string, nearLocation?: { lat: number; lng: number }): Promise<Place[]> {
  return new Promise((resolve, reject) => {
    const request: google.maps.places.TextSearchRequest = {
      query,
      ...(nearLocation
        ? { location: new google.maps.LatLng(nearLocation.lat, nearLocation.lng), radius: 5000 }
        : {}),
    }
    getPlacesService().textSearch(request, (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        reject(new Error(`Places search failed: ${status}`))
        return
      }
      resolve(
        results.slice(0, 10).map((r) => ({
          id: uuid(),
          name: r.name ?? '',
          googlePlaceId: r.place_id,
          lat: r.geometry?.location?.lat(),
          lng: r.geometry?.location?.lng(),
        }))
      )
    })
  })
}

export function autocompletePlaces(input: string): Promise<google.maps.places.AutocompletePrediction[]> {
  const service = new google.maps.places.AutocompleteService()
  return new Promise((resolve) => {
    service.getPlacePredictions({ input }, (predictions, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
        resolve([])
        return
      }
      resolve(predictions.slice(0, 10))
    })
  })
}

export function getPlaceDetails(placeId: string): Promise<Place> {
  return new Promise((resolve, reject) => {
    getPlacesService().getDetails(
      { placeId, fields: ['place_id', 'name', 'geometry', 'formatted_address', 'rating'] },
      (result, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !result) {
          reject(new Error(`Place details failed: ${status}`))
          return
        }
        resolve({
          id: uuid(),
          name: result.name ?? '',
          googlePlaceId: result.place_id,
          lat: result.geometry?.location?.lat(),
          lng: result.geometry?.location?.lng(),
        })
      }
    )
  })
}
```

- [ ] **Step 4: Create searchPlacesTool.ts**

Create `src/lib/maps/searchPlacesTool.ts`:
```ts
import type { LlmTool } from '../llm/index'

export const searchPlacesTool: LlmTool = {
  name: 'searchPlaces',
  description: 'Search for real places using Google Places. Call this whenever the user wants to find, add, or get suggestions for places to visit.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query, e.g. "famous ramen near Bukchon Hanok Village"' },
      nearLocation: {
        type: 'object',
        description: 'Optional center point for the search',
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
        },
        required: ['lat', 'lng'],
      },
    },
    required: ['query'],
  },
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test placesSearch
```
Expected: PASS — 5 tests passing

- [ ] **Step 6: Commit**

```bash
git add src/lib/maps/placesSearch.ts src/lib/maps/searchPlacesTool.ts src/tests/lib/placesSearch.test.ts
git commit -m "feat: add Google Places search and autocomplete library"
```

---

### Task 13: Command bar — Search mode

**Files:**
- Create: `src/components/trip/ModeToggle.tsx`
- Create: `src/components/trip/PlacePicker.tsx`
- Create: `src/components/trip/CommandBar.tsx`
- Modify: `src/pages/TripPage.tsx`

- [ ] **Step 1: Create ModeToggle**

Create `src/components/trip/ModeToggle.tsx`:
```tsx
type Mode = 'search' | 'plan'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
}

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex bg-slate-800 rounded-full p-0.5 text-xs">
      {(['search', 'plan'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-3 py-1 rounded-full font-medium transition-colors ${
            mode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {m === 'search' ? '🔍 Search' : '✨ Plan'}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create PlacePicker**

Create `src/components/trip/PlacePicker.tsx`:
```tsx
import type { Place } from '../../types'

interface Props {
  places: Place[]
  onPick: (place: Place, target: 'plan' | 'maybe') => void
  onDismiss: () => void
}

export default function PlacePicker({ places, onPick, onDismiss }: Props) {
  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-[480px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {places.length} results — pick one
        </span>
        <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 text-sm">✕</button>
      </div>
      <div className="overflow-y-auto max-h-72">
        {places.map((place, i) => (
          <div key={place.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 border-b border-slate-800/50 last:border-0">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-100 truncate">{place.name}</div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => onPick(place, 'plan')}
                className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-2 py-1 rounded"
              >
                + Plan
              </button>
              <button
                onClick={() => onPick(place, 'maybe')}
                className="text-xs bg-emerald-900 hover:bg-emerald-800 text-emerald-300 px-2 py-1 rounded"
              >
                + Maybe
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create CommandBar (Search mode)**

Create `src/components/trip/CommandBar.tsx`:
```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useTripStore } from '../../stores/tripStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { autocompletePlaces, getPlaceDetails } from '../../lib/maps/placesSearch'
import ModeToggle from './ModeToggle'
import PlacePicker from './PlacePicker'
import CommentaryBubble from './CommentaryBubble'
import ScopeToggle from './ScopeToggle'
import type { Place } from '../../types'

type Mode = 'search' | 'plan'

interface Props {
  tripId: string
  onCandidatesChange: (places: Place[]) => void
  focusRef?: React.MutableRefObject<(() => void) | null>
}

export default function CommandBar({ tripId, onCandidatesChange, focusRef }: Props) {
  const [mode, setMode] = useState<Mode>('search')
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Place[]>([])
  const [commentary, setCommentary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { trips, activeSlotId, updateSlot } = useTripStore()
  const { googleMapsApiKey } = useSettingsStore()
  const trip = trips.find((t) => t.id === tripId)!
  const activeSlot = trip.slots.find((s) => s.id === activeSlotId)

  // Allow parent to focus the search bar (for "+ add place" button)
  useEffect(() => {
    if (focusRef) {
      focusRef.current = () => {
        setMode('search')
        inputRef.current?.focus()
      }
    }
  }, [focusRef])

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Autocomplete on query change (search mode)
  useEffect(() => {
    if (mode !== 'search' || !query.trim() || !googleMapsApiKey) {
      setCandidates([])
      onCandidatesChange([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const predictions = await autocompletePlaces(query)
        const places: Place[] = predictions.map((p) => ({
          id: p.place_id,
          name: p.structured_formatting?.main_text ?? p.description,
          googlePlaceId: p.place_id,
        }))
        setCandidates(places)
        onCandidatesChange(places)
      } catch {
        setCandidates([])
      }
    }, 300)
  }, [query, mode, googleMapsApiKey])

  async function handlePickPlace(place: Place, target: 'plan' | 'maybe') {
    if (!activeSlot) return
    setLoading(true)
    try {
      // Fetch full details (lat/lng) if not already present
      const full = place.lat ? place : await getPlaceDetails(place.googlePlaceId!)
      updateSlot(activeSlot.id, {
        [target === 'plan' ? 'places' : 'maybes']: [
          ...(target === 'plan' ? activeSlot.places : activeSlot.maybes),
          full,
        ],
      })
    } catch {
      setError('Failed to get place details. Try again.')
    } finally {
      setLoading(false)
      setQuery('')
      setCandidates([])
      onCandidatesChange([])
    }
  }

  function dismissCandidates() {
    setCandidates([])
    onCandidatesChange([])
    setQuery('')
  }

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[480px]">
      {commentary && mode === 'plan' && (
        <CommentaryBubble text={commentary} onDismiss={() => setCommentary(null)} />
      )}

      <div className="relative">
        {candidates.length > 0 && mode === 'search' && (
          <PlacePicker places={candidates} onPick={handlePickPlace} onDismiss={dismissCandidates} />
        )}

        <div className="bg-slate-800 border border-indigo-500/50 rounded-full px-4 py-2.5 flex items-center gap-3 shadow-2xl shadow-indigo-900/30">
          <span className="text-base">✨</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'search' ? 'Search places… (⌘K)' : 'Ask AI to edit your plan… (⌘K)'}
            className="flex-1 bg-transparent text-slate-200 text-sm placeholder:text-slate-500 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && mode === 'plan' && handlePlanSubmit()}
          />
          {loading && <span className="text-slate-500 text-xs animate-pulse">…</span>}
          <ModeToggle mode={mode} onChange={(m) => { setMode(m); setQuery(''); setCandidates([]); onCandidatesChange([]) }} />
          {mode === 'plan' && <ScopeToggle />}
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center mt-1.5">{error}</p>
        )}
      </div>
    </div>
  )

  // Plan mode submit — implemented in Task 15
  function handlePlanSubmit() {
    // Placeholder until Task 15
    setError('Plan mode requires LLM setup (Task 15)')
  }
}
```

- [ ] **Step 4: Create stub CommentaryBubble and ScopeToggle (needed by CommandBar)**

Create `src/components/trip/CommentaryBubble.tsx`:
```tsx
interface Props { text: string; onDismiss: () => void }

export default function CommentaryBubble({ text, onDismiss }: Props) {
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 mb-2 text-sm text-slate-200 leading-relaxed relative">
      <button onClick={onDismiss} className="absolute top-2 right-3 text-slate-500 hover:text-slate-300 text-xs">✕</button>
      <p className="italic">{text}</p>
    </div>
  )
}
```

Create `src/components/trip/ScopeToggle.tsx`:
```tsx
import { useTripStore } from '../../stores/tripStore'

export default function ScopeToggle() {
  const { llmScope, toggleLlmScope } = useTripStore()
  return (
    <button
      onClick={toggleLlmScope}
      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded-full transition-colors flex-shrink-0"
      title={llmScope === 'slot' ? 'Currently editing active slot only' : 'Currently editing all slots'}
    >
      {llmScope === 'slot' ? 'Slot' : 'Trip'}
    </button>
  )
}
```

- [ ] **Step 5: Wire CommandBar into TripPage**

In `src/pages/TripPage.tsx`:
```tsx
import { useRef } from 'react'
import CommandBar from '../components/trip/CommandBar'
import type { Place } from '../types'

// In component body:
const [candidatePins, setCandidatePins] = useState<Place[]>([])
const focusSearchRef = useRef<(() => void) | null>(null)

// Pass focusSearchRef down through SlotDetail → PlaceList → onFocusSearch:
<SlotDetail
  tripId={trip.id}
  slot={activeSlot}
  onFocusSearch={() => focusSearchRef.current?.()}
/>

// In the map container:
<MapPanel tripId={trip.id} candidatePins={candidatePins} />

// After the CollapseHandle (outside panels, as absolute overlay):
<CommandBar
  tripId={trip.id}
  onCandidatesChange={setCandidatePins}
  focusRef={focusSearchRef}
/>
```

Add `useState` import and `Place` import.

- [ ] **Step 6: Write CommandBar smoke test**

Create `src/tests/components/CommandBar.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CommandBar from '../../components/trip/CommandBar'

vi.mock('../../lib/maps/placesSearch', () => ({
  autocompletePlaces: vi.fn().mockResolvedValue([]),
  getPlaceDetails: vi.fn(),
}))
vi.mock('../../stores/tripStore', () => ({
  useTripStore: vi.fn(() => ({
    trips: [{ id: 't1', slots: [], snapshots: [] }],
    activeSlotId: null,
    llmScope: 'slot',
    updateSlot: vi.fn(),
    toggleLlmScope: vi.fn(),
  })),
}))
vi.mock('../../stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({ googleMapsApiKey: 'fake' })),
}))

describe('CommandBar', () => {
  it('renders search input and mode toggle', () => {
    render(
      <MemoryRouter>
        <CommandBar tripId="t1" onCandidatesChange={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText(/search places/i)).toBeInTheDocument()
    expect(screen.getByText(/🔍 Search/i)).toBeInTheDocument()
    expect(screen.getByText(/✨ Plan/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run tests**

```bash
pnpm test CommandBar
```
Expected: PASS

- [ ] **Step 8: Verify in browser**

- Open a trip, select a slot
- Press ⌘K → search bar focuses
- Type a place name → autocomplete results appear above the bar
- Map highlights candidates as orange numbered pins
- Click "+ Plan" on a result → place appears in the plan list

- [ ] **Step 9: Commit**

```bash
git add src/components/trip/CommandBar.tsx src/components/trip/ModeToggle.tsx src/components/trip/PlacePicker.tsx src/components/trip/CommentaryBubble.tsx src/components/trip/ScopeToggle.tsx src/pages/TripPage.tsx src/tests/components/CommandBar.test.tsx
git commit -m "feat: add command bar with search mode, autocomplete, and place picker"
```

---

### Task 14: LLM client

**Files:**
- Create: `src/lib/llm/index.ts`
- Create: `src/lib/llm/anthropic.ts`
- Create: `src/lib/llm/openai.ts`
- Create: `src/lib/llm/gemini.ts`
- Create: `src/lib/llm/ollama.ts`
- Create: `src/tests/lib/llm.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tests/lib/llm.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLlmClient } from '../../lib/llm/index'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => { mockFetch.mockReset() })

describe('Anthropic provider', () => {
  const client = createLlmClient('anthropic', 'sk-ant-test')

  it('returns text content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Hello from Claude' }],
      }),
    })
    const res = await client.complete([{ role: 'user', content: 'hi' }])
    expect(res.content).toBe('Hello from Claude')
  })

  it('returns tool calls when LLM uses a tool', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'tool_use', id: 'tu_1', name: 'searchPlaces', input: { query: 'ramen' } }],
      }),
    })
    const res = await client.complete([{ role: 'user', content: 'find ramen' }])
    expect(res.toolCalls).toHaveLength(1)
    expect(res.toolCalls![0].name).toBe('searchPlaces')
    expect(res.toolCalls![0].arguments).toEqual({ query: 'ramen' })
  })

  it('throws on non-OK HTTP response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 })
    await expect(client.complete([{ role: 'user', content: 'hi' }])).rejects.toThrow('401')
  })
})

describe('OpenAI provider', () => {
  const client = createLlmClient('openai', 'sk-test')

  it('returns text content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hello from GPT' } }] }),
    })
    const res = await client.complete([{ role: 'user', content: 'hi' }])
    expect(res.content).toBe('Hello from GPT')
  })
})

describe('Gemini provider', () => {
  const client = createLlmClient('gemini', 'AIza-test')

  it('returns text content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Hello from Gemini' }] } }],
      }),
    })
    const res = await client.complete([{ role: 'user', content: 'hi' }])
    expect(res.content).toBe('Hello from Gemini')
  })
})

describe('Ollama provider', () => {
  const client = createLlmClient('ollama', '')

  it('returns text content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'Hello from Llama' } }),
    })
    const res = await client.complete([{ role: 'user', content: 'hi' }])
    expect(res.content).toBe('Hello from Llama')
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm test llm
```
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Create LLM index (interface + factory)**

Create `src/lib/llm/index.ts`:
```ts
import type { LlmProvider } from '../../types'
import { AnthropicClient } from './anthropic'
import { OpenAiClient } from './openai'
import { GeminiClient } from './gemini'
import { OllamaClient } from './ollama'

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
}

export interface LlmTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface LlmToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface LlmResponse {
  content?: string
  toolCalls?: LlmToolCall[]
}

export interface LlmClient {
  complete(messages: LlmMessage[], tools?: LlmTool[]): Promise<LlmResponse>
}

export function createLlmClient(provider: LlmProvider, apiKey: string): LlmClient {
  switch (provider) {
    case 'anthropic': return new AnthropicClient(apiKey)
    case 'openai': return new OpenAiClient(apiKey)
    case 'gemini': return new GeminiClient(apiKey)
    case 'ollama': return new OllamaClient()
  }
}
```

- [ ] **Step 4: Create Anthropic provider**

Create `src/lib/llm/anthropic.ts`:
```ts
import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class AnthropicClient implements LlmClient {
  constructor(private apiKey: string) {}

  async complete(messages: LlmMessage[], tools?: LlmTool[]): Promise<LlmResponse> {
    const system = messages.find((m) => m.role === 'system')?.content
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'tool' ? 'user' : m.role, content: m.content }))

    const body: Record<string, unknown> = {
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: chatMessages,
    }
    if (system) body.system = system
    if (tools?.length) {
      body.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }))
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)
    const data = await res.json()

    const toolUse = data.content?.find((c: { type: string }) => c.type === 'tool_use')
    if (toolUse) {
      return { toolCalls: [{ id: toolUse.id, name: toolUse.name, arguments: toolUse.input }] }
    }
    return { content: data.content?.find((c: { type: string }) => c.type === 'text')?.text ?? '' }
  }
}
```

- [ ] **Step 5: Create OpenAI provider**

Create `src/lib/llm/openai.ts`:
```ts
import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class OpenAiClient implements LlmClient {
  constructor(private apiKey: string) {}

  async complete(messages: LlmMessage[], tools?: LlmTool[]): Promise<LlmResponse> {
    const body: Record<string, unknown> = {
      model: 'gpt-4o',
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      })),
    }
    if (tools?.length) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }))
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)
    const data = await res.json()
    const msg = data.choices[0].message

    if (msg.tool_calls?.length) {
      return {
        toolCalls: msg.tool_calls.map((tc: { id: string; function: { name: string; arguments: string } }) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })),
      }
    }
    return { content: msg.content ?? '' }
  }
}
```

- [ ] **Step 6: Create Gemini provider**

Create `src/lib/llm/gemini.ts`:
```ts
import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class GeminiClient implements LlmClient {
  constructor(private apiKey: string) {}

  async complete(messages: LlmMessage[], tools?: LlmTool[]): Promise<LlmResponse> {
    const system = messages.find((m) => m.role === 'system')?.content
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const body: Record<string, unknown> = { contents }
    if (system) body.systemInstruction = { parts: [{ text: system }] }
    if (tools?.length) {
      body.tools = [{
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      }]
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)
    const data = await res.json()
    const part = data.candidates?.[0]?.content?.parts?.[0]

    if (part?.functionCall) {
      return {
        toolCalls: [{ id: part.functionCall.name, name: part.functionCall.name, arguments: part.functionCall.args }],
      }
    }
    return { content: part?.text ?? '' }
  }
}
```

- [ ] **Step 7: Create Ollama provider**

Create `src/lib/llm/ollama.ts`:
```ts
import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class OllamaClient implements LlmClient {
  async complete(messages: LlmMessage[], tools?: LlmTool[]): Promise<LlmResponse> {
    const body: Record<string, unknown> = {
      model: 'llama3.1',
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
    }
    if (tools?.length) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }))
    }

    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`)
    const data = await res.json()
    const msg = data.message

    if (msg.tool_calls?.length) {
      return {
        toolCalls: msg.tool_calls.map(
          (tc: { function: { name: string; arguments: unknown } }, i: number) => ({
            id: `ollama-${i}`,
            name: tc.function.name,
            arguments: typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments,
          })
        ),
      }
    }
    return { content: msg.content ?? '' }
  }
}
```

- [ ] **Step 8: Run tests**

```bash
pnpm test llm
```
Expected: PASS — all provider tests passing

- [ ] **Step 9: Commit**

```bash
git add src/lib/llm src/tests/lib/llm.test.ts
git commit -m "feat: add multi-provider LLM client (Anthropic, OpenAI, Gemini, Ollama)"
```

---

### Task 15: Command bar — Plan mode

**Files:**
- Modify: `src/components/trip/CommandBar.tsx`

- [ ] **Step 1: Create the system prompt builder**

Add a `buildSystemPrompt` helper at the top of `src/components/trip/CommandBar.tsx` (before the component):

```ts
import type { Slot, Trip } from '../../types'

function buildSystemPrompt(scope: 'slot' | 'trip'): string {
  return `You are a helpful travel planning assistant. The user is editing a trip plan.

The plan is structured as slots (named time blocks), each containing:
- places: ordered array of Place objects the user will visit
- maybes: unordered array of Place objects the user might visit if time permits

A Place has: { id, name, googlePlaceId?, lat?, lng?, estimatedDuration? }

Your job: respond with a JSON object matching exactly ONE of these two schemas:

Schema A — when you can make changes directly:
{
  "type": "planUpdate",
  "commentary": "A short travel-advisor note explaining what you changed and why (tips, warnings, suggestions). Be helpful and specific.",
  ${scope === 'slot'
    ? '"updatedSlot": { ...full updated Slot object }'
    : '"updatedSlots": [ ...full updated array of all Slot objects ]'}
}

Schema B — when you need the user to choose a place (call searchPlaces tool first, then return this):
{
  "type": "placePicker",
  "commentary": "A note explaining what you found.",
  "suggestedCandidates": [ ...array of Place objects from search results ]
}

Rules:
- NEVER invent place names or coordinates. Use the searchPlaces tool to find real places.
- ALWAYS return valid JSON. No markdown code blocks. No extra text.
- Keep place IDs unchanged when reordering existing places.
- New places added from searchPlaces results should keep the Place object returned by the tool.`
}
```

- [ ] **Step 2: Create the agentic tool-call loop**

Add an `executePlanMode` function to `CommandBar.tsx`, before the return statement:

```ts
import { createLlmClient } from '../../lib/llm/index'
import { textSearchPlaces } from '../../lib/maps/placesSearch'
import { searchPlacesTool } from '../../lib/maps/searchPlacesTool'
import type { LlmMessage } from '../../lib/llm/index'

// Inside the CommandBar component:
async function executePlanMode(userQuery: string) {
  const { llmProvider, apiKeys, googleMapsApiKey } = useSettingsStore.getState()
  const apiKey = apiKeys[llmProvider]

  if (!apiKey && llmProvider !== 'ollama') {
    setError(`No ${llmProvider} API key configured. Open ⚙ Settings.`)
    return
  }

  setLoading(true)
  setError(null)
  setCommentary(null)

  try {
    const client = createLlmClient(llmProvider, apiKey)
    const scope = useTripStore.getState().llmScope
    const currentTrip = useTripStore.getState().trips.find((t) => t.id === tripId)!
    const currentSlot = currentTrip.slots.find((s) => s.id === useTripStore.getState().activeSlotId)

    const contextJson = scope === 'slot'
      ? JSON.stringify(currentSlot ?? {})
      : JSON.stringify(currentTrip.slots)

    const messages: LlmMessage[] = [
      { role: 'system', content: buildSystemPrompt(scope) },
      { role: 'user', content: `Current ${scope === 'slot' ? 'slot' : 'all slots'}:\n${contextJson}\n\nInstruction: ${userQuery}` },
    ]

    // Agentic loop: keep running until LLM stops calling tools
    let iterations = 0
    while (iterations < 5) {
      iterations++
      const response = await client.complete(messages, [searchPlacesTool])

      if (response.toolCalls?.length) {
        for (const tc of response.toolCalls) {
          if (tc.name === 'searchPlaces') {
            const { query, nearLocation } = tc.arguments as { query: string; nearLocation?: { lat: number; lng: number } }
            const results = await textSearchPlaces(query, googleMapsApiKey, nearLocation)
            messages.push({ role: 'assistant', content: JSON.stringify(response) })
            messages.push({
              role: 'tool',
              content: JSON.stringify(results),
              toolCallId: tc.id,
            })
          }
        }
        continue
      }

      // Final text response — parse JSON
      const text = response.content ?? ''
      const parsed = JSON.parse(text)

      setCommentary(parsed.commentary ?? null)

      if (parsed.type === 'planUpdate') {
        if (scope === 'slot' && parsed.updatedSlot && currentSlot) {
          useTripStore.getState().updateSlot(currentSlot.id, parsed.updatedSlot)
          useTripStore.getState().saveSnapshot(tripId, userQuery, false, parsed.commentary)
        } else if (scope === 'trip' && parsed.updatedSlots) {
          for (const updatedSlot of parsed.updatedSlots) {
            useTripStore.getState().updateSlot(updatedSlot.id, updatedSlot)
          }
          useTripStore.getState().saveSnapshot(tripId, userQuery, false, parsed.commentary)
        }
      } else if (parsed.type === 'placePicker' && parsed.suggestedCandidates) {
        setCandidates(parsed.suggestedCandidates)
        onCandidatesChange(parsed.suggestedCandidates)
      }

      break
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
  } finally {
    setLoading(false)
    setQuery('')
  }
}
```

- [ ] **Step 3: Replace the placeholder handlePlanSubmit**

In `CommandBar.tsx`, replace:
```ts
function handlePlanSubmit() {
  setError('Plan mode requires LLM setup (Task 15)')
}
```

With:
```ts
function handlePlanSubmit() {
  if (!query.trim()) return
  executePlanMode(query.trim())
}
```

- [ ] **Step 4: Verify end-to-end in browser**

With real API keys configured:

1. Open a trip, create a slot "Morning", add 2-3 places via Search mode
2. Switch to ✨ Plan mode
3. Type: "optimize the order of my stops to minimize walking"
4. Press Enter → loading indicator → slot reorders → commentary appears above bar
5. Check history panel → new snapshot with your prompt and the AI's commentary
6. Type: "add a famous ramen restaurant near my first stop" → LLM calls searchPlaces → PlacePicker appears → pick one → place added to plan → snapshot saved

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/CommandBar.tsx
git commit -m "feat: add LLM plan mode with tool calling, commentary, and snapshot auto-save"
```

---

### Task 16: Final wiring and error states

**Files:**
- Modify: `src/components/trip/MapPanel.tsx` (re-center on slot change)
- Modify: `src/pages/TripPage.tsx` (missing-key prompts)

- [ ] **Step 1: Add missing-key banners**

In `src/pages/TripPage.tsx`, add a check at the top of the component after the `trip` lookup:
```tsx
const googleMapsApiKey = useSettingsStore((s) => s.googleMapsApiKey)
const llmApiKey = useSettingsStore((s) => {
  const { llmProvider, apiKeys } = s
  return llmProvider === 'ollama' ? 'ollama' : apiKeys[llmProvider]
})

// After the "trip not found" early return, before the main render:
const missingKeys: string[] = []
if (!googleMapsApiKey) missingKeys.push('Google Maps API key')
if (!llmApiKey) missingKeys.push(`${useSettingsStore.getState().llmProvider} API key`)
```

Add a dismissable banner inside the `<header>` when keys are missing:
```tsx
{missingKeys.length > 0 && (
  <div className="bg-amber-900/40 border-b border-amber-800 px-6 py-2 text-xs text-amber-300 flex items-center justify-between">
    <span>⚠ Missing: {missingKeys.join(', ')}. Configure in ⚙ Settings.</span>
  </div>
)}
```

Add import: `import { useSettingsStore } from '../stores/settingsStore'`

- [ ] **Step 3: Run full test suite**

```bash
pnpm test
```
Expected: All tests pass — no regressions.

- [ ] **Step 4: Final manual verification checklist**

With real API keys:
- [ ] Create a trip → opens planner
- [ ] Add slots on multiple dates → date sidebar groups them correctly
- [ ] Drag-reorder slots within same day
- [ ] Select slot → detail shows plan + maybe pool
- [ ] Press ⌘K → command bar focuses
- [ ] Search mode: type a place → autocomplete → orange pins on map → pick one → added to plan
- [ ] Click blue pin on map → popup appears → move to maybe → pin turns green
- [ ] Switch to Plan mode → type "optimize my stops" → AI reorders → commentary shown → snapshot saved in history
- [ ] Plan mode with trip scope → "add a dinner slot every night"
- [ ] Click 💾 in history header → save modal → snapshot appears
- [ ] Click ↩ revert on an old snapshot → plan reverts
- [ ] Collapse history panel via ⟩ handle → map expands
- [ ] Open settings → change LLM provider → API key field updates
- [ ] Refresh page → all data persists (localStorage)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: wire final error states, missing-key banners, and fix MaybePool type"
```

---

## Milestone Summary

| Milestone | Tasks | Deliverable |
|-----------|-------|-------------|
| Foundation | 1–4 | Working SPA shell with routing and stores |
| Home page | 5–6 | Trip card grid, create/delete trips, settings |
| Trip planner UI | 7–10 | 3-panel layout, slots, drag places, history |
| Map + search | 11–13 | Live map, autocomplete search, place picker |
| LLM | 14–15 | Multi-provider AI editing with tool calling |
| Polish | 16 | Error states, final wiring |
