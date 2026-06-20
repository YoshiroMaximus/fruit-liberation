import type { FeatureCollection, Feature, Point } from 'geojson'
import type { Cluster, ListLocation } from './types'
import { iconIdFor, type TypeIndex } from './typeIndex'

export function clustersToGeoJSON(clusters: Cluster[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: clusters.map(
      (c): Feature<Point> => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
        properties: { count: c.count, label: abbreviate(c.count) },
      }),
    ),
  }
}

export function locationsToGeoJSON(
  locations: ListLocation[],
  typeIndex: TypeIndex | null,
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: locations.map((loc): Feature<Point> => {
      const primary = loc.type_ids?.[0]
      const t = primary != null ? typeIndex?.byId.get(primary) : undefined
      const name = t?.name ?? (loc.type_ids?.length ? 'Edible plant' : 'Unknown')
      // Only id (click + ring filters), name (label), and icon (symbol) are read
      // by the map layers — color/emoji are baked into the icon image.
      return {
        type: 'Feature',
        id: loc.id,
        geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
        properties: { id: loc.id, name, icon: iconIdFor(t?.kind ?? 'other') },
      }
    }),
  }
}

export function abbreviate(n: number): string {
  if (n < 1000) return String(n)
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

export const EMPTY_FC: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: [],
}
