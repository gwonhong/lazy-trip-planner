import type { Snapshot } from '../../types'

interface Props {
  snapshot: Snapshot
  isLatest: boolean
  onRevert: () => void
}

export default function SnapshotCard({ snapshot, isLatest, onRevert }: Props) {
  const time = new Date(snapshot.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`rounded-md border p-2.5 text-xs ${isLatest ? 'bg-slate-800 border-slate-600' : 'bg-slate-950 border-slate-800'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-500">{time}</span>
        <div className="flex items-center gap-1.5">
          {snapshot.isManual && (
            <span className="bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full text-xs">💾 manual</span>
          )}
          {isLatest ? (
            <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-xs">latest</span>
          ) : (
            <button
              aria-label="Revert to this snapshot"
              onClick={onRevert}
              className="border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded-full text-xs transition-colors"
            >
              ↩ revert
            </button>
          )}
        </div>
      </div>
      <p className="text-slate-200 mb-0.5 truncate"><span aria-hidden="true">"</span>{snapshot.label}<span aria-hidden="true">"</span></p>
      <p className="text-slate-500 truncate">{snapshot.summary}</p>
      {snapshot.commentary && (
        <p className="text-slate-400 italic mt-1 text-xs leading-relaxed border-t border-slate-800 pt-1">
          {snapshot.commentary}
        </p>
      )}
    </div>
  )
}
