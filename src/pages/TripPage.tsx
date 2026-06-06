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
