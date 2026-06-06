import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTripStore } from '../stores/tripStore'
import SettingsModal from '../components/shared/SettingsModal'
import CollapseHandle from '../components/trip/CollapseHandle'
import DateSidebar from '../components/trip/DateSidebar'

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
        {/* Left panel: date sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
          <DateSidebar tripId={trip.id} />
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
