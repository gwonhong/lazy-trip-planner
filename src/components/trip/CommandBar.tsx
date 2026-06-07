import { useState, useRef, useEffect } from 'react'
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

  // Plan mode submit — full implementation in Task 15
  function handlePlanSubmit() {
    setError('Plan mode requires LLM setup (Task 15)')
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
}
