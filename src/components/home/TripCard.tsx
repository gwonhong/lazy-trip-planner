import type { Trip } from '../../types'

interface Props {
  trip: Trip
  onOpen: () => void
  onDelete: () => void
}

export default function TripCard({ trip, onOpen, onDelete }: Props) {
  return (
    <div
      onClick={onOpen}
      className="bg-slate-800 border border-slate-700 rounded-xl p-5 cursor-pointer hover:border-indigo-500 transition-colors group"
    >
      <h3 className="text-slate-100 font-semibold text-base mb-1">{trip.title}</h3>
      <p className="text-slate-400 text-sm mb-3">{trip.destination}</p>
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs">{trip.startDate} – {trip.endDate}</span>
        <button
          aria-label="Delete trip"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="text-slate-600 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
