import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the google.maps namespace
const mockTextSearch = vi.fn()
const mockGetPredictions = vi.fn()
const mockGetDetails = vi.fn()

vi.stubGlobal('google', {
  maps: {
    places: {
      PlacesService: vi.fn(() => ({ textSearch: mockTextSearch, getDetails: mockGetDetails })),
      AutocompleteService: vi.fn(() => ({ getPlacePredictions: mockGetPredictions })),
      PlacesServiceStatus: { OK: 'OK', ZERO_RESULTS: 'ZERO_RESULTS' },
    },
    LatLng: vi.fn((lat: number, lng: number) => ({ lat: () => lat, lng: () => lng })),
  },
})

import { textSearchPlaces, autocompletePlaces, getPlaceDetails } from '../../lib/maps/placesSearch'

beforeEach(() => { vi.clearAllMocks() })

describe('textSearchPlaces', () => {
  it('returns mapped Place objects on OK status', async () => {
    mockTextSearch.mockImplementation((_req: unknown, cb: Function) => {
      cb([
        { place_id: 'p1', name: 'Ramen Shop', geometry: { location: { lat: () => 37.5, lng: () => 127.0 } } },
      ], 'OK')
    })
    const results = await textSearchPlaces('ramen near Bukchon', 'fake-key')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Ramen Shop')
    expect(results[0].googlePlaceId).toBe('p1')
    expect(results[0].lat).toBe(37.5)
  })

  it('throws on non-OK status', async () => {
    mockTextSearch.mockImplementation((_req: unknown, cb: Function) => cb(null, 'ZERO_RESULTS'))
    await expect(textSearchPlaces('nowhere', 'fake-key')).rejects.toThrow()
  })
})

describe('autocompletePlaces', () => {
  it('returns predictions on OK status', async () => {
    const predictions = [{ place_id: 'p1', description: 'Gyeongbokgung Palace', structured_formatting: { main_text: 'Gyeongbokgung' } }]
    mockGetPredictions.mockImplementation((_req: unknown, cb: Function) => cb(predictions, 'OK'))
    const results = await autocompletePlaces('Gyeong')
    expect(results).toHaveLength(1)
    expect(results[0].description).toBe('Gyeongbokgung Palace')
  })

  it('returns empty array on non-OK status', async () => {
    mockGetPredictions.mockImplementation((_req: unknown, cb: Function) => cb(null, 'ZERO_RESULTS'))
    const results = await autocompletePlaces('xyz')
    expect(results).toEqual([])
  })
})

describe('getPlaceDetails', () => {
  it('returns a Place with lat/lng', async () => {
    mockGetDetails.mockImplementation((_req: unknown, cb: Function) => {
      cb({ place_id: 'p1', name: 'Test Place', geometry: { location: { lat: () => 37.5, lng: () => 127.0 } } }, 'OK')
    })
    const place = await getPlaceDetails('p1')
    expect(place.name).toBe('Test Place')
    expect(place.lat).toBe(37.5)
  })
})
