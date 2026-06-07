import { useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTripStore } from '../../stores/tripStore'
import { loadGoogleMaps } from '../../lib/maps/loader'
import PlacePinPopup from './PlacePinPopup'
import type { Place } from '../../types'

interface PopupState {
  place: Place
  listType: 'plan' | 'maybe'
  position: { x: number; y: number }
}

interface Props {
  tripId: string
  candidatePins?: Place[]
}

export default function MapPanel({ tripId, candidatePins }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const googleMapsApiKey = useSettingsStore((s) => s.googleMapsApiKey)
  const { trips, activeSlotId, updateSlot } = useTripStore()
  const trip = trips.find((t) => t.id === tripId)!
  const activeSlot = trip.slots.find((s) => s.id === activeSlotId)
  const [popup, setPopup] = useState<PopupState | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize map
  useEffect(() => {
    if (!googleMapsApiKey) { setError('No Google Maps API key. Configure it in ⚙ Settings.'); return }
    loadGoogleMaps(googleMapsApiKey)
      .then(() => {
        if (!mapRef.current || mapInstanceRef.current) return
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: { lat: 37.5665, lng: 126.978 }, // Seoul default
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          styles: [{ elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
                   { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
                   { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] }],
        })
      })
      .catch(() => setError('Failed to load Google Maps. Check your API key.'))
  }, [googleMapsApiKey])

  // Update markers whenever active slot or candidates change
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const pins = candidatePins ?? []
    const planPlaces = activeSlot?.places ?? []
    const maybePlaces = activeSlot?.maybes ?? []

    if (pins.length > 0) {
      // Candidate pins (numbered, orange)
      pins.forEach((place, i) => {
        if (!place.lat || !place.lng) return
        const marker = new google.maps.Marker({
          map,
          position: { lat: place.lat, lng: place.lng },
          label: { text: String(i + 1), color: 'white', fontSize: '11px', fontWeight: 'bold' },
          icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#f97316', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 10 },
        })
        markersRef.current.push(marker)
      })
    } else {
      // Plan pins (blue, numbered)
      planPlaces.forEach((place, i) => {
        if (!place.lat || !place.lng) return
        const marker = new google.maps.Marker({
          map,
          position: { lat: place.lat, lng: place.lng },
          label: { text: String(i + 1), color: 'white', fontSize: '11px', fontWeight: 'bold' },
          icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#6366f1', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 10 },
        })
        marker.addListener('click', (e: google.maps.MapMouseEvent) => {
          const me = e.domEvent as MouseEvent
          setPopup({ place, listType: 'plan', position: { x: me.clientX, y: me.clientY } })
        })
        markersRef.current.push(marker)
      })

      // Maybe pins (green, smaller)
      maybePlaces.forEach((place) => {
        if (!place.lat || !place.lng) return
        const marker = new google.maps.Marker({
          map,
          position: { lat: place.lat, lng: place.lng },
          icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#22c55e', fillOpacity: 0.8, strokeColor: '#fff', strokeWeight: 2, scale: 7 },
        })
        marker.addListener('click', (e: google.maps.MapMouseEvent) => {
          const me = e.domEvent as MouseEvent
          setPopup({ place, listType: 'maybe', position: { x: me.clientX, y: me.clientY } })
        })
        markersRef.current.push(marker)
      })
    }

    // Fit bounds to visible pins
    const allWithCoords = [...planPlaces, ...maybePlaces, ...pins].filter((p) => p.lat && p.lng)
    if (allWithCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      allWithCoords.forEach((p) => bounds.extend({ lat: p.lat!, lng: p.lng! }))
      map.fitBounds(bounds, 80)
    }
  }, [activeSlot, candidatePins])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-center px-6">
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="h-full w-full" />
      {popup && (
        <div
          className="fixed z-50"
          style={{ left: popup.position.x, top: popup.position.y, transform: 'translate(-50%, -110%)' }}
        >
          <PlacePinPopup
            place={popup.place}
            listType={popup.listType}
            onClose={() => setPopup(null)}
            onMoveToMaybe={() => {
              if (!activeSlot) return
              updateSlot(activeSlot.id, {
                places: activeSlot.places.filter((p) => p.id !== popup.place.id),
                maybes: [...activeSlot.maybes, popup.place],
              })
              setPopup(null)
            }}
            onMoveToPlan={() => {
              if (!activeSlot) return
              updateSlot(activeSlot.id, {
                maybes: activeSlot.maybes.filter((p) => p.id !== popup.place.id),
                places: [...activeSlot.places, popup.place],
              })
              setPopup(null)
            }}
            onRemove={() => {
              if (!activeSlot) return
              updateSlot(activeSlot.id, {
                places: activeSlot.places.filter((p) => p.id !== popup.place.id),
                maybes: activeSlot.maybes.filter((p) => p.id !== popup.place.id),
              })
              setPopup(null)
            }}
          />
        </div>
      )}
    </div>
  )
}
