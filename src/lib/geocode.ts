/** Lightweight place search via OSM Nominatim (no key, CORS-enabled).
 *  Called on submit (not per keystroke) to respect the usage policy. */

export interface Place {
  name: string
  lat: number
  lng: number
}

export async function geocodePlace(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q, format: 'json', limit: '6', addressdetails: '0' })
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Place search failed')
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[]
  return data.map((d) => ({
    name: d.display_name,
    lat: Number(d.lat),
    lng: Number(d.lon),
  }))
}
