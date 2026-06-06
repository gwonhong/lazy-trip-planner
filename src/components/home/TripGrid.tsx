import { useNavigate } from 'react-router-dom'
import { useTripStore } from '../../stores/tripStore'
import TripCard from './TripCard'

export default function TripGrid() {
  const navigate = useNavigate()
  const { trips, deleteTrip } = useTripStore()

  if (trips.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-16">
        No trips yet. Create your first one.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {trips.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          onOpen={() => navigate(`/trip/${trip.id}`)}
          onDelete={() => deleteTrip(trip.id)}
        />
      ))}
    </div>
  )
}
