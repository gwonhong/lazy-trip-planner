import { Loader } from '@googlemaps/js-api-loader'

let loaderPromise: Promise<void> | null = null

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (!loaderPromise) {
    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['places'] })
    loaderPromise = loader.load()
  }
  return loaderPromise
}
