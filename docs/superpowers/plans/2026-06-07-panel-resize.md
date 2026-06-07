# Panel Resize Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to drag the vertical dividers between the left/map and map/right panels to resize them, with widths persisted across reloads.

**Architecture:** A new `useLayoutStore` (Zustand + `persist`) holds `leftPanelWidth` and `rightPanelWidth`. A `usePanelResize` hook owns the pointer-event drag math and returns an `onPointerDown` handler. A `ResizeDivider` component renders the draggable strip. `TripPage` replaces fixed Tailwind width classes with inline styles from the store.

**Tech Stack:** React, Zustand (`persist` middleware), TypeScript, Vitest + `@testing-library/react`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/stores/layoutStore.ts` | Create | Zustand persist store for left/right panel widths |
| `src/lib/usePanelResize.ts` | Create | Pointer-event drag logic; returns `onPointerDown` handler |
| `src/components/shared/ResizeDivider.tsx` | Create | 5px draggable vertical strip |
| `src/pages/TripPage.tsx` | Modify | Replace fixed widths; insert `ResizeDivider`s |
| `src/tests/stores/layoutStore.test.ts` | Create | Store unit tests |
| `src/tests/lib/usePanelResize.test.tsx` | Create | Hook drag-math unit tests |
| `src/tests/components/ResizeDivider.test.tsx` | Create | Component render tests |

---

## Task 1: `layoutStore`

**Files:**
- Create: `src/stores/layoutStore.ts`
- Create: `src/tests/stores/layoutStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/stores/layoutStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useLayoutStore } from '../../stores/layoutStore'

beforeEach(() => {
  useLayoutStore.setState({ leftPanelWidth: 288, rightPanelWidth: 224 })
})

describe('useLayoutStore', () => {
  it('has default leftPanelWidth of 288', () => {
    expect(useLayoutStore.getState().leftPanelWidth).toBe(288)
  })

  it('has default rightPanelWidth of 224', () => {
    expect(useLayoutStore.getState().rightPanelWidth).toBe(224)
  })

  it('setLeftPanelWidth updates leftPanelWidth', () => {
    useLayoutStore.getState().setLeftPanelWidth(350)
    expect(useLayoutStore.getState().leftPanelWidth).toBe(350)
  })

  it('setRightPanelWidth updates rightPanelWidth', () => {
    useLayoutStore.getState().setRightPanelWidth(300)
    expect(useLayoutStore.getState().rightPanelWidth).toBe(300)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose src/tests/stores/layoutStore.test.ts
```

Expected: FAIL — `Cannot find module '../../stores/layoutStore'`

- [ ] **Step 3: Implement the store**

Create `src/stores/layoutStore.ts`:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type LayoutState = {
  leftPanelWidth: number
  rightPanelWidth: number
  setLeftPanelWidth: (w: number) => void
  setRightPanelWidth: (w: number) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      leftPanelWidth: 288,
      rightPanelWidth: 224,
      setLeftPanelWidth: (w) => set({ leftPanelWidth: w }),
      setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
    }),
    { name: 'lazy-trip-planner-layout' }
  )
)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose src/tests/stores/layoutStore.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/stores/layoutStore.ts src/tests/stores/layoutStore.test.ts
git commit -m "feat: add layoutStore for panel width persistence"
```

---

## Task 2: `usePanelResize` hook

**Files:**
- Create: `src/lib/usePanelResize.ts`
- Create: `src/tests/lib/usePanelResize.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/lib/usePanelResize.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { usePanelResize } from '../../lib/usePanelResize'

function Handle({ width, setWidth, min, max }: {
  width: number
  setWidth: (w: number) => void
  min: number
  max: number
}) {
  const onPointerDown = usePanelResize(width, setWidth, min, max)
  return <div data-testid="handle" onPointerDown={onPointerDown} />
}

describe('usePanelResize', () => {
  let setWidth: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setWidth = vi.fn()
  })

  it('calls setWidth with width + delta on pointermove', () => {
    render(<Handle width={288} setWidth={setWidth} min={200} max={480} />)
    const handle = screen.getByTestId('handle')

    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 150 })

    expect(setWidth).toHaveBeenCalledWith(338) // 288 + 50
  })

  it('clamps width to min', () => {
    render(<Handle width={288} setWidth={setWidth} min={200} max={480} />)
    const handle = screen.getByTestId('handle')

    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 0 }) // delta = -100, 288-100=188 < 200

    expect(setWidth).toHaveBeenCalledWith(200)
  })

  it('clamps width to max', () => {
    render(<Handle width={288} setWidth={setWidth} min={200} max={480} />)
    const handle = screen.getByTestId('handle')

    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 400 }) // delta = 300, 288+300=588 > 480

    expect(setWidth).toHaveBeenCalledWith(480)
  })

  it('stops calling setWidth after pointerup', () => {
    render(<Handle width={288} setWidth={setWidth} min={200} max={480} />)
    const handle = screen.getByTestId('handle')

    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerUp(window)
    fireEvent.pointerMove(window, { clientX: 200 })

    expect(setWidth).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose src/tests/lib/usePanelResize.test.tsx
```

Expected: FAIL — `Cannot find module '../../lib/usePanelResize'`

- [ ] **Step 3: Implement the hook**

Create `src/lib/usePanelResize.ts`:

```ts
import { useCallback } from 'react'

export function usePanelResize(
  currentWidth: number,
  setWidth: (w: number) => void,
  min: number,
  max: number
): (e: React.PointerEvent) => void {
  return useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = currentWidth

      const onMove = (ev: PointerEvent) => {
        const next = Math.min(max, Math.max(min, startWidth + (ev.clientX - startX)))
        setWidth(next)
      }

      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [currentWidth, setWidth, min, max]
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose src/tests/lib/usePanelResize.test.tsx
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/usePanelResize.ts src/tests/lib/usePanelResize.test.tsx
git commit -m "feat: add usePanelResize hook for drag interaction"
```

---

## Task 3: `ResizeDivider` component

**Files:**
- Create: `src/components/shared/ResizeDivider.tsx`
- Create: `src/tests/components/ResizeDivider.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/components/ResizeDivider.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResizeDivider from '../../components/shared/ResizeDivider'

describe('ResizeDivider', () => {
  it('renders without crashing', () => {
    render(<ResizeDivider onPointerDown={() => {}} />)
  })

  it('calls onPointerDown when pointer is pressed', () => {
    const handler = vi.fn()
    render(<ResizeDivider onPointerDown={handler} />)
    fireEvent.pointerDown(screen.getByRole('separator'))
    expect(handler).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose src/tests/components/ResizeDivider.test.tsx
```

Expected: FAIL — `Cannot find module '../../components/shared/ResizeDivider'`

- [ ] **Step 3: Implement the component**

Create `src/components/shared/ResizeDivider.tsx`:

```tsx
interface Props {
  onPointerDown: (e: React.PointerEvent) => void
}

export default function ResizeDivider({ onPointerDown }: Props) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="w-[5px] flex-shrink-0 cursor-col-resize bg-slate-800 hover:bg-indigo-500/40 transition-colors"
      onPointerDown={onPointerDown}
    />
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose src/tests/components/ResizeDivider.test.tsx
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/ResizeDivider.tsx src/tests/components/ResizeDivider.test.tsx
git commit -m "feat: add ResizeDivider drag handle component"
```

---

## Task 4: Wire up `TripPage`

**Files:**
- Modify: `src/pages/TripPage.tsx`

No new test file — covered by the existing test suite running green.

- [ ] **Step 1: Run the full test suite to establish baseline**

```bash
npm test
```

Expected: all existing tests PASS. Note the count.

- [ ] **Step 2: Update `TripPage.tsx`**

Open `src/pages/TripPage.tsx`. Apply the following changes:

**Add imports** (after the existing import block, around line 12):

```tsx
import { useLayoutStore } from '../stores/layoutStore'
import { usePanelResize } from '../lib/usePanelResize'
import ResizeDivider from '../components/shared/ResizeDivider'
```

**Read widths and build handlers** — add inside the `TripPage` function body, after the existing `const focusSearchRef` line (~line 22):

```tsx
const leftPanelWidth = useLayoutStore((s) => s.leftPanelWidth)
const rightPanelWidth = useLayoutStore((s) => s.rightPanelWidth)
const setLeftPanelWidth = useLayoutStore((s) => s.setLeftPanelWidth)
const setRightPanelWidth = useLayoutStore((s) => s.setRightPanelWidth)

const onLeftResize = usePanelResize(leftPanelWidth, setLeftPanelWidth, 200, 480)
const onRightResize = usePanelResize(rightPanelWidth, setRightPanelWidth, 150, 400)
```

**Replace the three-panel `div` block** (lines 66–110). The full replacement:

```tsx
{/* Three-panel body */}
<div className="flex flex-1 overflow-hidden relative">
  {/* Left panel: date sidebar + slot detail */}
  <div className="flex-shrink-0 flex overflow-hidden" style={{ width: leftPanelWidth }}>
    {/* Date sidebar takes fixed 144px */}
    <div className="w-36 flex-shrink-0 border-r border-slate-800 overflow-hidden">
      <DateSidebar tripId={trip.id} />
    </div>
    {/* Slot detail takes remaining width */}
    <div className="flex-1 overflow-hidden">
      {activeSlot ? (
        <SlotDetail
          slot={activeSlot}
          onFocusSearch={() => focusSearchRef.current?.()}
        />
      ) : (
        <div className="h-full flex items-center justify-center text-slate-600 text-sm text-center px-4">
          Select a slot to see its plan
        </div>
      )}
    </div>
  </div>

  {/* Left resize divider */}
  <ResizeDivider onPointerDown={onLeftResize} />

  {/* Middle panel: map */}
  <div className="flex-1 relative overflow-hidden">
    <MapPanel tripId={trip.id} candidatePins={candidatePins} />
    <CommandBar
      tripId={trip.id}
      onCandidatesChange={setCandidatePins}
      focusRef={focusSearchRef}
    />
  </div>

  {/* Collapse handle on the map/history divider */}
  <CollapseHandle
    collapsed={historyCollapsed}
    onToggle={() => setHistoryCollapsed((v) => !v)}
  />

  {/* Right panel: history */}
  {!historyCollapsed && (
    <>
      <ResizeDivider onPointerDown={onRightResize} />
      <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: rightPanelWidth }}>
        <HistoryPanel tripId={trip.id} />
      </div>
    </>
  )}
</div>
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: same count as baseline, all PASS. (TripPage is not unit-tested, so no new failures.)

- [ ] **Step 4: Manually verify in the browser**

```bash
npm run dev
```

Open a trip. Confirm:
1. Dragging the left divider (between left panel and map) resizes the left panel
2. Dragging the right divider (between CollapseHandle and history panel) resizes the right panel
3. Widths respect min/max (can't drag below 200px left, 150px right)
4. Reload the page — widths restore to the values you set
5. Collapsing and reopening the history panel restores the persisted right-panel width

- [ ] **Step 5: Commit**

```bash
git add src/pages/TripPage.tsx
git commit -m "feat: wire panel resize into TripPage"
```
