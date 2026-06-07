import type { Place } from '../../types'
import { uuid } from '../utils'

// Exposed for testing — reset between tests if needed
export let _placesService: google.maps.places.PlacesService | null = null

function getPlacesService(): google.maps.places.PlacesService {
  if (!_placesService) {
    _placesService = new google.maps.places.PlacesService(document.createElement('div'))
  }
  return _placesService!
}

export function textSearchPlaces(query: string, _apiKey: string, nearLocation?: { lat: number; lng: number }): Promise<Place[]> {
  return new Promise((resolve, reject) => {
    const request: google.maps.places.TextSearchRequest = {
      query,
      ...(nearLocation
        ? { location: new google.maps.LatLng(nearLocation.lat, nearLocation.lng), radius: 5000 }
        : {}),
    }
    getPlacesService().textSearch(request, (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        const hint = status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED
          ? 'REQUEST_DENIED — enable the Places API in Google Cloud Console'
          : status
        reject(new Error(`Places search failed: ${hint}`))
        return
      }
      resolve(
        results.slice(0, 10).map((r) => ({
          id: uuid(),
          name: r.name ?? '',
          googlePlaceId: r.place_id,
          lat: r.geometry?.location?.lat(),
          lng: r.geometry?.location?.lng(),
        }))
      )
    })
  })
}

export function autocompletePlaces(input: string): Promise<google.maps.places.AutocompletePrediction[]> {
  const service = new google.maps.places.AutocompleteService()
  return new Promise((resolve) => {
    service.getPlacePredictions({ input }, (predictions, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
        resolve([])
        return
      }
      resolve(predictions.slice(0, 10))
    })
  })
}

export function getPlaceDetails(placeId: string): Promise<Place> {
  return new Promise((resolve, reject) => {
    getPlacesService().getDetails(
      { placeId, fields: ['place_id', 'name', 'geometry', 'formatted_address', 'rating'] },
      (result, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !result) {
          reject(new Error(`Place details failed: ${status}`))
          return
        }
        resolve({
          id: uuid(),
          name: result.name ?? '',
          googlePlaceId: result.place_id,
          lat: result.geometry?.location?.lat(),
          lng: result.geometry?.location?.lng(),
        })
      }
    )
  })
}
