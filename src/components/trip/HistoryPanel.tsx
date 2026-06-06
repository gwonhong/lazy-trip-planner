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
