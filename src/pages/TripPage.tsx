import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTripStore } from '../stores/tripStore'
import SettingsModal from '../components/shared/SettingsModal'
import CollapseHandle from '../components/trip/CollapseHandle'
import DateSidebar from '../components/trip/DateSidebar'
import SlotDetail from '../components/trip/SlotDetail'
import HistoryPanel from '../components/trip/HistoryPanel'
import MapPanel from '../components/trip/MapPanel'
import CommandBar from '../components/trip/CommandBar'
import type { Place } from '../types'

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const trip = useTripStore((s) => s.trips.find((t) => t.id === id))
  const activeSlotId = useTripStore((s) => s.activeSlotId)
  const [historyCollapsed, setHistoryCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [candidatePins, setCandidatePins] = useState<Place[]>([])
  const focusSearchRef = useRef<(() => void) | null>(null)

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

  const activeSlot = trip.slots.find((s) => s.id === activeSlotId) ?? null

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
                onFocusSearch={() => focusSearchRef.current?.()}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm text-center px-4">
                Select a slot to see its plan
              </div>
            )}
          </div>
        </div>

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
          <div className="w-56 flex-shrink-0 border-l border-slate-800 flex flex-col overflow-hidden">
            <HistoryPanel tripId={trip.id} />
          </div>
        )}
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
