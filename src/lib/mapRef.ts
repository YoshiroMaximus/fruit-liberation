import type maplibregl from 'maplibre-gl'

/** Module-level handle to the live map, so non-map components (e.g. the
 *  add-a-spot flow) can read the current center or nudge the view. */
let mapInstance: maplibregl.Map | null = null

export const setMap = (m: maplibregl.Map | null) => {
  mapInstance = m
}
export const getMap = () => mapInstance
