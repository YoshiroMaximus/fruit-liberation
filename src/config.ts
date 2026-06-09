/** App-wide configuration constants. */

/** Same-origin API base. In dev, Vite proxies this to the Falling Fruit API
 *  (injecting the key); in prod, the Cloudflare Pages Function does. */
export const API_BASE = '/api'

/** OpenFreeMap basemap styles (no API key required). */
export const BASEMAP_STYLES = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  positron: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const

export type BasemapId = keyof typeof BASEMAP_STYLES

/** Zoom at/above which we show individual locations instead of server clusters. */
export const INDIVIDUAL_ZOOM = 14

/** Max individual locations to request for the current viewport. */
export const LOCATION_LIMIT = 1000

/** Default map view (continental US) used before geolocation resolves. */
export const DEFAULT_VIEW = { lng: -98.5, lat: 39.8, zoom: 4 }

/** localStorage / IndexedDB keys. */
export const STORAGE_KEYS = {
  saved: 'fl.saved.v1',
  settings: 'fl.settings.v1',
  filters: 'fl.filters.v1',
  auth: 'fl.auth.v1',
  typesCache: 'fl.types.cache.v1',
} as const

/** How long to trust the cached /types catalog before refetching (ms). */
export const TYPES_TTL_MS = 1000 * 60 * 60 * 24 * 7
