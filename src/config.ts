/** App-wide configuration constants. */

/** Same-origin API base. In dev, Vite proxies this to the Falling Fruit API
 *  (injecting the key); in prod, the Cloudflare Pages Function does. */
export const API_BASE = '/api'

export type BasemapId = 'liberty' | 'bright' | 'positron' | 'dark'
/** What the user can choose; 'auto' follows the app's light/dark theme. */
export type BasemapChoice = BasemapId | 'auto'

/** Resolve a basemap choice to a concrete style id (auto → theme-matched). */
export function resolveBasemap(choice: BasemapChoice, dark: boolean): BasemapId {
  if (choice === 'auto') return dark ? 'dark' : 'liberty'
  return choice
}

/** Free, keyless OpenFreeMap styles (the default). */
const OPENFREEMAP_STYLES: Record<BasemapId, string> = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  positron: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}

/** MapTiler style ids mapped to our basemap ids (used when a key is configured). */
const MAPTILER_STYLES: Record<BasemapId, string> = {
  liberty: 'streets-v2',
  bright: 'bright-v2',
  positron: 'dataviz',
  dark: 'streets-v2-dark',
}

/** Public MapTiler key, baked at build time. Set VITE_MAPTILER_KEY to enable
 *  MapTiler's (prettier) styles; restrict the key to your domain in MapTiler. */
const MAPTILER_KEY = (import.meta.env.VITE_MAPTILER_KEY as string | undefined) || ''

export const usingMapTiler = MAPTILER_KEY.length > 0

/** Resolve a basemap id to a style URL — MapTiler if a key is set, else OpenFreeMap. */
export function basemapStyleUrl(id: BasemapId): string {
  if (MAPTILER_KEY) {
    return `https://api.maptiler.com/maps/${MAPTILER_STYLES[id]}/style.json?key=${MAPTILER_KEY}`
  }
  return OPENFREEMAP_STYLES[id]
}

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
