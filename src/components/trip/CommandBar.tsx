import { useState, useRef, useEffect } from 'react'
import { useTripStore } from '../../stores/tripStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { autocompletePlaces, getPlaceDetails, textSearchPlaces } from '../../lib/maps/placesSearch'
import ModeToggle from './ModeToggle'
import PlacePicker from './PlacePicker'
import CommentaryBubble from './CommentaryBubble'
import ScopeToggle from './ScopeToggle'
import type { Place } from '../../types'
import { createLlmClient } from '../../lib/llm/index'
import { searchPlacesTool } from '../../lib/maps/searchPlacesTool'
import type { LlmMessage } from '../../lib/llm/index'

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

  // Allow parent to focus the search bar
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

  async function executePlanMode(userQuery: string) {
    const { llmProvider, apiKeys, models, googleMapsApiKey: mapsKey } = useSettingsStore.getState()
    const apiKey = apiKeys[llmProvider]

    if (!apiKey && llmProvider !== 'ollama') {
      setError(`No ${llmProvider} API key configured. Open ⚙ Settings.`)
      return
    }

    setLoading(true)
    setError(null)
    setCommentary(null)

    try {
      const client = createLlmClient(llmProvider, apiKey, models[llmProvider])
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

      // Each client handles its own tool-call loop with the correct provider message format
      const response = await client.complete(messages, [searchPlacesTool], async (name, args) => {
        if (name === 'searchPlaces') {
          const { query: searchQuery, nearLocation } = args as { query: string; nearLocation?: { lat: number; lng: number } }
          const results = await textSearchPlaces(searchQuery, mapsKey, nearLocation)
          return JSON.stringify(results)
        }
        return '[]'
      })

      // Strip potential markdown fences before parsing
      let text = (response.content ?? '').trim()
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
      }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
      setQuery('')
    }
  }

  function handlePlanSubmit() {
    if (!query.trim()) return
    executePlanMode(query.trim())
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
            onKeyDown={async (e) => {
              if (e.key !== 'Enter') return
              if (mode === 'plan') { handlePlanSubmit(); return }
              // search mode: trigger a deliberate text search on Enter
              if (!query.trim() || !googleMapsApiKey) return
              setLoading(true)
              try {
                const results = await textSearchPlaces(query.trim(), googleMapsApiKey)
                setCandidates(results)
                onCandidatesChange(results)
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Search failed. Check your Google Maps API key.')
              } finally {
                setLoading(false)
              }
            }}
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
}
