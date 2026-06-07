# Panel Resize Feature — Design Spec

**Date:** 2026-06-07  
**Status:** Approved

## Overview

Add drag-to-resize for the left and right panels in `TripPage`. Users drag the vertical divider between panels horizontally to adjust widths. Sizes persist across reloads via Zustand's `persist` middleware, matching the existing settings/trip store pattern.

## Scope

- **In scope:** left panel outer edge (left↔map), right panel outer edge (map↔right)
- **Out of scope:** inner left-panel split (date sidebar vs slot detail stays fixed)

## Architecture

### `src/stores/layoutStore.ts`

New Zustand store with `persist` middleware, keyed `'lazy-trip-planner-layout'`.

```ts
{
  leftPanelWidth: 288,   // default: current w-72
  rightPanelWidth: 224,  // default: current w-56
  setLeftPanelWidth: (w: number) => void
  setRightPanelWidth: (w: number) => void
}
```

Follows the same shape as `settingsStore.ts` — `create<...>()(persist(..., { name: '...' }))`.

### `src/lib/usePanelResize.ts`

Custom hook that owns drag interaction logic only. Width state and persistence are fully delegated to `layoutStore`.

```ts
function usePanelResize(
  currentWidth: number,
  setWidth: (w: number) => void,
  opts: { min: number; max: number }
): (e: React.PointerEvent) => void
```

Behavior:
1. `onPointerDown`: capture pointer on the divider element, record `startX` and `startWidth`
2. `onPointermove` (on `window`): compute `delta = e.clientX - startX`, clamp `startWidth + delta` to `[min, max]`, call `setWidth`
3. `onPointerUp` / `onPointerCancel` (on `window`): release pointer capture, remove window listeners
4. Cleanup via `useEffect` return to remove listeners if component unmounts mid-drag

### `src/components/shared/ResizeDivider.tsx`

Thin vertical strip that acts as the drag handle.

- **Width:** 5px, `cursor-col-resize`
- **Default appearance:** matches existing `border-slate-800` color (blends with panel borders)
- **Hover:** subtle highlight (e.g. `bg-indigo-500/30`) to signal draggability
- **Props:** `{ onPointerDown: (e: React.PointerEvent) => void }`
- Replaces the `border-r` / `border-l` styling previously on the panel divs

### `src/pages/TripPage.tsx`

Changes to the three-panel layout `div`:

| Panel | Before | After |
|-------|--------|-------|
| Left | `w-72 flex-shrink-0 border-r border-slate-800` | `flex-shrink-0` + `style={{ width: leftPanelWidth }}`, `border-r` removed |
| Middle | `flex-1` | unchanged |
| Right | `w-56 flex-shrink-0 border-l border-slate-800` | `flex-shrink-0` + `style={{ width: rightPanelWidth }}`, `border-l` removed |

A `<ResizeDivider>` is inserted:
- Between left panel and middle panel (left edge of map)
- Between middle panel and right panel (right edge of map, left of `CollapseHandle`)

`CollapseHandle` and its collapse behavior are untouched.

## Width Constraints

| Panel | Default | Min | Max |
|-------|---------|-----|-----|
| Left | 288px | 200px | 480px |
| Right | 224px | 150px | 400px |
| Map | flex-1 | ~300px (implicit, enforced by panel maxes) | — |

## Data Flow

```
User drags ResizeDivider
  → usePanelResize onPointerMove
    → clamped width computed
      → layoutStore.setLeftPanelWidth / setRightPanelWidth
        → Zustand persist middleware writes to localStorage
          → TripPage re-renders with new inline width style
```

## Files Changed

| File | Action |
|------|--------|
| `src/stores/layoutStore.ts` | Create |
| `src/lib/usePanelResize.ts` | Create |
| `src/components/shared/ResizeDivider.tsx` | Create |
| `src/pages/TripPage.tsx` | Modify |
