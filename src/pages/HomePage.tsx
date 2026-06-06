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
