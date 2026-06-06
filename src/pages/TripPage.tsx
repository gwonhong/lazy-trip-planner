import { useParams } from 'react-router-dom'

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  return <div className="min-h-screen bg-slate-950 text-slate-100 p-8">Trip: {id}</div>
}
