import { useState } from 'react'
import Modal from '../shared/Modal'

interface Props {
  onClose: () => void
  onCreate: (data: { title: string; destination: string; startDate: string; endDate: string }) => void
}

export default function NewTripModal({ onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const valid = title && destination && startDate && endDate

  return (
    <Modal title="New Trip" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500"
          placeholder="Trip title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500"
          placeholder="Destination (e.g. Seoul, Korea)"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        <div className="flex gap-2">
          <input type="date" className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button
          disabled={!valid}
          onClick={() => valid && onCreate({ title, destination, startDate, endDate })}
          className="mt-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          Create Trip
        </button>
      </div>
    </Modal>
  )
}
