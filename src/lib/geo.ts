/** Geo math + map deep-links. No external dependencies. */

export interface LatLng {
  lat: number
  lng: number
}

const R = 6371000 // Earth radius, meters
const toRad = (d: number) => (d * Math.PI) / 180

/** Great-circle distance in meters. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(meters: number, imperial = true): string {
  if (imperial) {
    const feet = meters * 3.28084
    if (feet < 1000) return `${Math.round(feet / 10) * 10} ft`
    const miles = meters / 1609.344
    return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`
  }
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  const km = meters / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

/** Greedy nearest-neighbour ordering of `points`, starting from `origin`. */
export function nearestNeighborOrder<T extends LatLng>(origin: LatLng, points: T[]): T[] {
  const remaining = [...points]
  const ordered: T[] = []
  let cursor: LatLng = origin
  while (remaining.length) {
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(cursor, remaining[i])
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    const [next] = remaining.splice(bestIdx, 1)
    ordered.push(next)
    cursor = next
  }
  return ordered
}

export function totalRouteDistance(origin: LatLng | null, stops: LatLng[]): number {
  if (!stops.length) return 0
  let total = 0
  let cursor = origin ?? stops[0]
  const seq = origin ? stops : stops.slice(1)
  for (const s of seq) {
    total += haversine(cursor, s)
    cursor = s
  }
  return total
}

/** Whether month `m` (0-based) falls in the [start, stop] season (handles wrap). */
export function monthInSeason(m: number, start: number, stop: number): boolean {
  return start <= stop ? m >= start && m <= stop : m >= start || m <= stop
}

/** Whether a season range is active in the current local month. */
export function isInSeasonNow(
  start: number | null | undefined,
  stop: number | null | undefined,
): boolean {
  if (start == null || stop == null) return false
  return monthInSeason(new Date().getMonth(), start, stop)
}

export const isApplePlatform = () =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent) &&
  // exclude obvious Android/Windows spoofs
  !/android|windows/i.test(navigator.userAgent)

const ll = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`

/**
 * Google Maps directions deep-link.
 * `destination` = last stop; up to 9 intermediate waypoints supported.
 */
export function googleMapsUrl(
  origin: LatLng | null,
  stops: LatLng[],
  mode: 'walking' | 'bicycling' | 'driving' | 'transit' = 'walking',
): string {
  if (!stops.length) return 'https://www.google.com/maps'
  const destination = stops[stops.length - 1]
  const waypoints = stops.slice(0, -1).slice(0, 9)
  const sp = new URLSearchParams({ api: '1', travelmode: mode })
  if (origin) sp.set('origin', ll(origin))
  sp.set('destination', ll(destination))
  if (waypoints.length) sp.set('waypoints', waypoints.map(ll).join('|'))
  return `https://www.google.com/maps/dir/?${sp.toString()}`
}

/**
 * Apple Maps directions deep-link. Multi-stop uses the legacy `+to:` chaining,
 * which Apple Maps honours best-effort.
 */
export function appleMapsUrl(
  origin: LatLng | null,
  stops: LatLng[],
  mode: 'w' | 'd' | 'r' = 'w',
): string {
  if (!stops.length) return 'https://maps.apple.com/'
  const sp = new URLSearchParams()
  if (origin) sp.set('saddr', ll(origin))
  sp.set('daddr', stops.map(ll).join('+to:'))
  sp.set('dirflg', mode)
  return `https://maps.apple.com/?${sp.toString()}`
}

/** A `geo:` URI – lets Android offer any installed maps app. */
export function geoUri(p: LatLng, label?: string): string {
  return label
    ? `geo:${p.lat},${p.lng}?q=${p.lat},${p.lng}(${encodeURIComponent(label)})`
    : `geo:${p.lat},${p.lng}`
}
