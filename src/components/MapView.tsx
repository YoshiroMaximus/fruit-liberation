import { useEffect, useRef, useState } from 'react'
import maplibregl, {
  type GeoJSONSource,
  type LayerSpecification,
  type MapLayerMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  basemapStyleUrl,
  DEFAULT_VIEW,
  INDIVIDUAL_ZOOM,
  LOCATION_LIMIT,
  resolveBasemap,
} from '../config'
import { SearchIcon } from './icons'
import { boundsParam, fetchClusters, fetchLocations } from '../lib/api'
import {
  clustersToGeoJSON,
  EMPTY_FC,
  locationsToGeoJSON,
} from '../lib/mapData'
import { useStore } from '../store/useStore'
import { setMap } from '../lib/mapRef'

const LOCATION_LAYERS = [
  'locations-saved',
  'locations-selected',
  'locations-circle',
  'locations-label',
]
const CLUSTER_LAYERS = ['clusters-circle', 'clusters-count']

function addSourcesAndLayers(map: maplibregl.Map) {
  if (!map.getSource('clusters')) {
    map.addSource('clusters', { type: 'geojson', data: EMPTY_FC })
  }
  if (!map.getSource('locations')) {
    map.addSource('locations', { type: 'geojson', data: EMPTY_FC })
  }

  // ---- clusters ----
  if (!map.getLayer('clusters-circle')) {
    map.addLayer({
      id: 'clusters-circle',
      type: 'circle',
      source: 'clusters',
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'count'],
          1, 13, 50, 18, 500, 24, 5000, 32, 50000, 44,
        ],
        'circle-color': [
          'interpolate', ['linear'], ['get', 'count'],
          1, '#6aa84f', 100, '#3f6b46', 2000, '#1f3d2b',
        ],
        'circle-opacity': 0.86,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(246,241,231,0.85)',
      },
    })
  }
  if (!map.getLayer('clusters-count')) {
    map.addLayer({
      id: 'clusters-count',
      type: 'symbol',
      source: 'clusters',
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 12,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': '#f6f1e7' },
    })
  }

  // ---- individual locations (rings beneath the colored dot) ----
  if (!map.getLayer('locations-saved')) {
    map.addLayer({
      id: 'locations-saved',
      type: 'circle',
      source: 'locations',
      filter: ['in', ['get', 'id'], ['literal', []]],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 8, 19, 14],
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#e8b923',
      },
    })
  }
  if (!map.getLayer('locations-selected')) {
    map.addLayer({
      id: 'locations-selected',
      type: 'circle',
      source: 'locations',
      filter: ['==', ['get', 'id'], -1],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 11, 19, 18],
        'circle-color': 'rgba(31,61,43,0.12)',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#1f3d2b',
      },
    })
  }
  if (!map.getLayer('locations-circle')) {
    map.addLayer({
      id: 'locations-circle',
      type: 'circle',
      source: 'locations',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3.5, 16, 7, 19, 10],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.96,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.92)',
      },
    })
  }
  if (!map.getLayer('locations-label')) {
    map.addLayer({
      id: 'locations-label',
      type: 'symbol',
      source: 'locations',
      // Names only appear when zoomed in close, and collision padding lets the
      // label engine thin them out so dense blocks stay readable.
      minzoom: 17,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-optional': true,
        'text-allow-overlap': false,
        'text-padding': 10,
        'text-max-width': 7,
      },
      paint: {
        'text-color': '#2a2d22',
        'text-halo-color': 'rgba(246,241,231,0.95)',
        'text-halo-width': 1.4,
      },
    })
  }
}

function setLayerVisibility(map: maplibregl.Map, ids: string[], visible: boolean) {
  for (const id of ids) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    }
  }
}

// Hide basemap POI + transit clutter (bus stops, station icons, shop/school
// labels) so our fruit markers stand out. Targets the OpenMapTiles `poi`/
// `transit` source-layers (used by both OpenFreeMap and MapTiler) plus any
// transit-ish layer id. Roads, street names, water, and parks are kept.
const POI_TRANSIT = /(^|[-_ ])(poi|transit|bus|aerodrome|airport|ferry|aerialway)([-_ ]|$)/i

function declutterBasemap(map: maplibregl.Map) {
  let layers: LayerSpecification[] | undefined
  try {
    layers = map.getStyle()?.layers
  } catch {
    return
  }
  if (!layers) return
  for (const layer of layers) {
    const id = layer.id
    if (id.startsWith('locations') || id.startsWith('clusters')) continue
    const srcLayer = (layer as { 'source-layer'?: string })['source-layer'] ?? ''
    if (
      srcLayer === 'poi' ||
      srcLayer === 'transit' ||
      POI_TRANSIT.test(id) ||
      POI_TRANSIT.test(srcLayer)
    ) {
      try {
        map.setLayoutProperty(id, 'visibility', 'none')
      } catch {
        /* some layers can't be toggled – skip */
      }
    }
  }
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)
  // Last successfully-fetched view + a flag to force the next fetch (filters,
  // flyTo) past the "pan → Search this area" gate. styleRef avoids redundant
  // setStyle reloads when the resolved basemap is unchanged.
  const forceRef = useRef(true)
  const lastFetchRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null)
  const styleRef = useRef('')
  const [ready, setReady] = useState(false)
  const [staleView, setStaleView] = useState(false)

  const settings = useStore((s) => s.settings)
  const resolvedTheme = useStore((s) => s.resolvedTheme)
  const selectedTypes = useStore((s) => s.selectedTypes)
  const typeIndex = useStore((s) => s.typeIndex)
  const saved = useStore((s) => s.saved)
  const selectedLocationId = useStore((s) => s.selectedLocationId)
  const userLocation = useStore((s) => s.userLocation)
  const flyTarget = useStore((s) => s.flyTarget)

  /* ---- create the map once ---- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const s0 = useStore.getState()
    const dark0 =
      s0.settings.theme === 'dark' ||
      (s0.settings.theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    styleRef.current = basemapStyleUrl(resolveBasemap(s0.settings.basemap, dark0))
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleRef.current,
      center: [DEFAULT_VIEW.lng, DEFAULT_VIEW.lat],
      zoom: DEFAULT_VIEW.zoom,
      attributionControl: { compact: true },
      maxZoom: 19,
      dragRotate: false,
      pitchWithRotate: false,
    })
    mapRef.current = map
    setMap(map)
    map.touchZoomRotate.disableRotation()

    const refresh = (immediate = false) => {
      window.clearTimeout(debounceRef.current)
      const run = () => void fetchForView()
      if (immediate) run()
      else debounceRef.current = window.setTimeout(run, 250)
    }

    const fetchForView = async () => {
      if (!map.getSource('locations')) return
      let b
      try {
        b = map.getBounds()
      } catch {
        return
      }
      const zoom = map.getZoom()
      const center = map.getCenter()
      const state = useStore.getState()
      const bounds = boundsParam({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      })
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      try {
        if (zoom >= INDIVIDUAL_ZOOM) {
          const { data, total } = await fetchLocations(
            {
              bounds,
              types: state.selectedTypes,
              muni: state.settings.muni,
              limit: LOCATION_LIMIT,
              count: true,
            },
            ac.signal,
          )
          ;(map.getSource('locations') as GeoJSONSource | undefined)?.setData(
            locationsToGeoJSON(data, useStore.getState().typeIndex),
          )
          ;(map.getSource('clusters') as GeoJSONSource | undefined)?.setData(EMPTY_FC)
          setLayerVisibility(map, CLUSTER_LAYERS, false)
          setLayerVisibility(map, LOCATION_LAYERS, true)
          state.setViewStatus({
            mode: 'locations',
            count: total ?? data.length,
            truncated: total != null && total > data.length,
          })
        } else {
          const clusters = await fetchClusters(
            {
              bounds,
              zoom: Math.min(14, Math.max(0, Math.round(zoom))),
              types: state.selectedTypes,
              muni: state.settings.muni,
            },
            ac.signal,
          )
          ;(map.getSource('clusters') as GeoJSONSource | undefined)?.setData(
            clustersToGeoJSON(clusters),
          )
          ;(map.getSource('locations') as GeoJSONSource | undefined)?.setData(EMPTY_FC)
          setLayerVisibility(map, LOCATION_LAYERS, false)
          setLayerVisibility(map, CLUSTER_LAYERS, true)
          state.setViewStatus({
            mode: 'clusters',
            count: clusters.reduce((sum, c) => sum + c.count, 0),
            truncated: false,
          })
        }
        lastFetchRef.current = { lat: center.lat, lng: center.lng, zoom }
        setStaleView(false)
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          // Network hiccup – keep last data on screen.
          // eslint-disable-next-line no-console
          console.warn('map data fetch failed', err)
        }
      }
    }

    // Re-add our sources/layers whenever the style (re)loads, then refresh.
    map.on('styledata', () => {
      if (!map.getSource('locations')) {
        addSourcesAndLayers(map)
        declutterBasemap(map)
        setReady(true)
        refresh(true)
      }
    })

    // Auto-fetch on zoom changes, filter changes, and programmatic flyTo
    // (forceRef); for a plain pan at the same zoom, offer "Search this area"
    // instead of silently refetching.
    map.on('moveend', () => {
      const z = map.getZoom()
      const c = map.getCenter()
      const prev = lastFetchRef.current
      if (forceRef.current || !prev) {
        forceRef.current = false
        refresh()
        return
      }
      if (Math.abs(z - prev.zoom) >= 0.4) {
        refresh()
        return
      }
      const p1 = map.project([c.lng, c.lat])
      const p2 = map.project([prev.lng, prev.lat])
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
      const el = map.getContainer()
      if (dist > 0.33 * Math.min(el.clientWidth, el.clientHeight)) {
        setStaleView(true)
      }
    })

    // ---- interactions ----
    for (const layer of ['clusters-circle', 'locations-circle']) {
      map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''))
    }

    map.on('click', 'clusters-circle', (e: MapLayerMouseEvent) => {
      if (useStore.getState().placing) return
      const f = e.features?.[0]
      if (!f) return
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
      map.easeTo({ center: [lng, lat], zoom: Math.min(19, map.getZoom() + 2.5) })
    })

    map.on('click', 'locations-circle', (e: MapLayerMouseEvent) => {
      if (useStore.getState().placing) return
      const f = e.features?.[0]
      if (!f) return
      const id = f.properties?.id as number
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
      useStore.getState().selectLocation(id)
      useStore.getState().setPanel('none')
      map.easeTo({ center: [lng, lat], offset: [0, -130], duration: 450 })
    })

    map.on('click', (e: MapLayerMouseEvent) => {
      if (useStore.getState().placing) return
      const layers = [...CLUSTER_LAYERS, ...LOCATION_LAYERS].filter((l) => map.getLayer(l))
      const hits = map.queryRenderedFeatures(e.point, { layers })
      if (!hits.length) useStore.getState().selectLocation(null)
    })

    const onResize = () => map.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(debounceRef.current)
      abortRef.current?.abort()
      map.remove()
      mapRef.current = null
      setMap(null)
    }
  }, [])

  /* ---- refetch when filters / muni / catalog change ---- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      forceRef.current = true // filter changes always refetch (skip the pan gate)
      map.fire('moveend')
    }, 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypes, settings.muni, typeIndex, ready])

  /* ---- change basemap (manual choice or theme when 'auto') ---- */
  useEffect(() => {
    const map = mapRef.current
    const next = basemapStyleUrl(resolveBasemap(settings.basemap, resolvedTheme === 'dark'))
    if (!map || !ready || next === styleRef.current) return
    styleRef.current = next
    map.setStyle(next)
    // styledata handler re-adds our layers + refreshes
  }, [settings.basemap, resolvedTheme, ready])

  /* ---- highlight saved spots ---- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.getLayer('locations-saved')) return
    const ids = saved.map((s) => s.id)
    map.setFilter('locations-saved', ['in', ['get', 'id'], ['literal', ids]])
  }, [saved, ready])

  /* ---- highlight the selected spot ---- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.getLayer('locations-selected')) return
    map.setFilter('locations-selected', ['==', ['get', 'id'], selectedLocationId ?? -1])
  }, [selectedLocationId, ready])

  /* ---- fly to an external target (e.g. from the saved list) ---- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !flyTarget) return
    forceRef.current = true // refetch at the destination, don't show the pill
    map.flyTo({
      center: [flyTarget.lng, flyTarget.lat],
      zoom: Math.max(flyTarget.zoom ?? 0, map.getZoom(), 16),
      offset: [0, -130],
      duration: 900,
    })
    useStore.getState().setFlyTarget(null)
  }, [flyTarget])

  /* ---- user location dot ---- */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!userLocation) {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      return
    }
    if (!userMarkerRef.current) {
      const el = document.createElement('div')
      el.className = 'user-loc'
      el.innerHTML = '<span class="user-loc__pulse"></span><span class="user-loc__dot"></span>'
      userMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([
        userLocation.lng,
        userLocation.lat,
      ])
      userMarkerRef.current.addTo(map)
    } else {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat])
    }
  }, [userLocation])

  return (
    <>
      <div ref={containerRef} className="map" aria-label="Map of edible plants" />
      {staleView && (
        <button
          className="search-area"
          onClick={() => {
            setStaleView(false)
            forceRef.current = true
            mapRef.current?.fire('moveend')
          }}
        >
          <SearchIcon width={15} height={15} />
          Search this area
        </button>
      )}
    </>
  )
}
