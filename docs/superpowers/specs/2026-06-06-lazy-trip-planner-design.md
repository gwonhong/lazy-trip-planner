# Lazy Trip Planner — Design Spec

**Date:** 2026-06-06
**Status:** Approved

---

## Overview

A desktop web app for flexible, low-pressure trip planning. Unlike rigid planners that enforce exact times, this app lets users drop places they want to visit into named slots, then ask an AI to help optimize the order and flag any issues. A map is always visible. Everything is stored locally — no accounts, no backend.

---

## Tech Stack

- **Framework:** Vite + React (SPA)
- **Routing:** React Router
- **State:** Zustand with `persist` middleware → `localStorage`
- **Map:** Google Maps JavaScript API (Places Autocomplete + Text Search)
- **LLM:** Multi-provider — Anthropic (claude-sonnet-4-6), OpenAI (gpt-4o), Gemini (gemini-2.0-flash), Ollama (local)
- **Drag and drop:** dnd-kit

---

## Pages

### Home (`/`)

NotebookLM-style card grid. Each card shows trip title, destination, and date range. Actions per card: open, delete. A "New Trip" button opens a modal to set title, destination, and start/end dates. Settings accessible via a gear icon in the top-right corner.

### Trip Planner (`/trip/:id`)

Three-panel layout (see below). Settings accessible via the same gear icon.

### Settings (modal)

Two sections:

**Map**
- Google Maps API key input
- Helper link: "Get a key → https://mapsplatform.google.com/maps-demo-key/"

**AI**
- Provider selector: Anthropic / OpenAI / Gemini / Ollama
- API key input per provider (Ollama requires no key)
- Keys stored in `localStorage`, never sent to any server other than the selected provider's API

If a required key is missing, the relevant panel (map or command bar) shows a prompt to configure it rather than failing silently.

---

## Trip Planner Layout

```
┌─────────────────┬──────────────────────────┬──────────────────┐
│  Date Sidebar   │                          │  History   [💾]  │
│  + Slot Detail  │       Google Map         ├──────────────────┤
│                 │                          │  SnapshotCard    │
│                 │                          │  SnapshotCard ⟩  │
└─────────────────┴──────────────────────────┴──────────────────┘
                    ┌─────────────────────┐
                    │  ✨ Plan  🔍 Search  │  ← floating ⌘K bar
                    └─────────────────────┘
```

- History panel collapses/expands via a `⟩` handle button centered on the vertical divider between map and history
- Floating command bar hovers near the bottom center of the screen, overlaid on the map
- "Save snapshot" button lives in the History panel header (top-right)

---

## Left Panel: Date Sidebar + Slot Detail

### Date Sidebar (dark)

Slots are grouped by date under a header label (`Jun 10 · Mon`). Within a date group, slots are ordered by a user-controlled `order` field and can be drag-reordered. Across date groups, slots auto-sort by date ascending.

Each slot entry shows:
- Drag handle (`⠿`)
- Title (e.g. "Seoul city tour")
- Optional time range below title (e.g. `09:00–13:00`) — only shown when `startTime`/`endTime` are set; nothing shown otherwise

A `+ new slot` button at the bottom opens an inline form: date picker + title input.

### Slot Detail

Shows the plan and maybe pool for the currently selected slot.

**Ordered plan** — numbered list of places, each with estimated duration. Draggable to reorder. Each place can be moved to the maybe pool or removed. An `+ add place` row at the bottom — clicking it focuses the command bar in Search mode.

**Maybe pool** — place chips below a divider. Places here are shown as green pins on the map. Each chip can be promoted to the plan or removed.

Selecting a slot in the sidebar re-centers the map to fit all of that slot's places.

---

## Middle Panel: Map

Google Maps JavaScript API embed. Always visible.

**Pins:**
- Blue: places in the ordered plan (numbered to match the list)
- Green (lighter): places in the maybe pool

Clicking a pin shows a popup with the place name + "Move to plan / Move to maybe / Remove" actions.

Map search is handled by the command bar's Search mode (see below), not a separate search bar on the map.

---

## Right Panel: History

Collapsible. Compact snapshot cards listed newest-first, each showing:
- Timestamp
- Prompt text (or "Manual save" label)
- One-line summary of what changed (or user-provided label for manual saves)
- `↩ revert` button
- `💾 manual` tag for manual saves; no tag for LLM-triggered snapshots

**Save snapshot button** (top-right of panel header) — creates a manual snapshot immediately. User can optionally label it.

**Commentary** — LLM planning responses include a commentary field (travel advisor notes). This is stored in the snapshot and shown as an additional line in the history card so past AI reasoning is readable later.

---

## Command Bar (floating ⌘K)

A floating pill near the bottom center of the screen. Press `⌘K` (or click) to focus. Contains a **mode toggle** pill:

### 🔍 Search mode (no LLM)

User types a place name → Google Places Autocomplete runs in real-time → up to 10 result cards appear above the bar (name, address, rating) → map temporarily replaces slot pins with numbered candidate pins → user picks one → prompt: "Add to **Plan** or **Maybe**?" → place added to active slot with real `placeId`, lat/lng → map restores slot pins.

### ✨ Plan mode (LLM)

User types a natural language instruction. The app sends:

1. System prompt: describes the data model, current scope, and instructs the LLM to respond in JSON with `commentary` + `updatedSlot` (or `updatedSlots` in trip scope)
2. Context: active slot data (Slot mode, default) or all slots (Trip mode, toggled via a `[Slot / Trip]` button inside the bar)
3. User instruction

**LLM response format — two variants (mutually exclusive):**

*Plan update* — when the LLM can apply changes directly:
```json
{
  "type": "planUpdate",
  "commentary": "Gyeongbokgung closes at 5pm on Tuesdays — moved it to the morning.",
  "updatedSlot": { }
}
```

*Place picker* — when the LLM needs the user to choose a place before applying:
```json
{
  "type": "placePicker",
  "commentary": "Found 10 ramen spots near Bukchon — pick one to add.",
  "suggestedCandidates": [ ]
}
```

- `commentary` — shown above the command bar as a travel-advisor message; persists until the next prompt; also saved in the snapshot
- `updatedSlot` / `updatedSlots` — applied to the store immediately; snapshot auto-saved
- `suggestedCandidates` — the same place picker UI as Search mode appears; user picks; selected place is added to the slot; snapshot saved after selection

**LLM tool: `searchPlaces`**

Available to the LLM in Plan mode. Signature:
```ts
searchPlaces(query: string, nearLocation?: { lat: number, lng: number }): Place[]
```
Calls Google Places Text Search API using the user's Google Maps key. Returns real results with `placeId`, name, address, rating, lat/lng. The LLM uses this when it needs to find or suggest specific places.

**Error handling:** Malformed JSON or API failure leaves the plan unchanged. An inline error message appears in the command bar. No partial updates.

---

## Data Model

All data stored in `localStorage` via Zustand `persist`.

```ts
type AppState = {
  settings: Settings
  trips: Trip[]
}

type Settings = {
  llmProvider: 'anthropic' | 'openai' | 'gemini' | 'ollama'
  apiKeys: { anthropic: string; openai: string; gemini: string; ollama: string }
  googleMapsApiKey: string
}

type Trip = {
  id: string            // uuid
  title: string
  destination: string
  startDate: string     // YYYY-MM-DD
  endDate: string       // YYYY-MM-DD
  createdAt: string
  slots: Slot[]
  snapshots: Snapshot[]
}

type Slot = {
  id: string
  date: string          // YYYY-MM-DD
  title: string
  order: number         // for drag-reorder within same date
  startTime?: string    // "09:00"
  endTime?: string      // "13:00"
  places: Place[]       // ordered plan
  maybes: Place[]       // maybe pool
}

type Place = {
  id: string
  name: string
  googlePlaceId?: string
  lat?: number
  lng?: number
  estimatedDuration?: number  // minutes
}

type Snapshot = {
  id: string
  createdAt: string
  label: string         // user prompt or "Manual save"
  summary: string       // one-line description of what changed
  commentary?: string   // LLM travel-advisor note (Plan mode only)
  isManual: boolean
  slotsSnapshot: Slot[] // deep copy of all slots at this point in time
}
```

---

## State Management

```
useTripStore
  trips, activeTripId, activeSlotId, llmScope: 'slot' | 'trip'
  createTrip / deleteTrip
  setActiveSlot
  updateSlot(slotId, patch)
  reorderSlotsWithinDay(date, newOrder)
  saveSnapshot(label, isManual, commentary?)
  revertToSnapshot(snapshotId)
  toggleLlmScope

useSettingsStore
  llmProvider, apiKeys, googleMapsApiKey
  updateSetting(key, value)
```

---

## Component Tree

```
App
├── HomePage
│   ├── TripGrid
│   │   └── TripCard (×n)
│   ├── NewTripModal
│   └── SettingsModal
│
└── TripPage
    ├── DateSidebar
    │   └── SlotEntry (×n)
    ├── SlotDetail
    │   ├── PlaceList (draggable)
    │   └── MaybePool
    ├── MapPanel
    │   └── PlacePinPopup
    ├── HistoryPanel (collapsible)
    │   ├── SnapshotCard (×n)
    │   └── SaveSnapshotButton
    ├── CollapseHandle          ← sits on the map/history divider edge
    ├── CommandBar (floating)
    │   ├── ModeToggle (Search / Plan)
    │   ├── ScopeToggle (Slot / Trip) — Plan mode only
    │   ├── CommentaryBubble    ← LLM travel-advisor message
    │   └── PlacePicker         ← shared by Search mode + LLM candidate results
    └── SettingsModal
```

---

## Out of Scope (v1)

- User accounts / cloud sync
- Mobile layout
- Collaboration / sharing
- Offline map tiles
- Export to PDF / calendar
