import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let loaderPromise: Promise<void> | null = null

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (!loaderPromise) {
    setOptions({ key: apiKey, v: 'weekly' })
    loaderPromise = importLibrary('maps')
      .then(() => importLibrary('places'))
      .then(() => undefined)
  }
  return loaderPromise!
}
