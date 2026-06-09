import { useEffect, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type MapLayerMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  BASEMAP_STYLES,
  DEFAULT_VIEW,
  INDIVIDUAL_ZOOM,
  LOCATION_LIMIT,
} from '../config'
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
      minzoom: 16,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-optional': true,
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

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)
  const [ready, setReady] = useState(false)

  const settings = useStore((s) => s.settings)
  const selectedTypes = useStore((s) => s.selectedTypes)
  const typeIndex = useStore((s) => s.typeIndex)
  const saved = useStore((s) => s.saved)
  const selectedLocationId = useStore((s) => s.selectedLocationId)
  const userLocation = useStore((s) => s.userLocation)
  const flyTarget = useStore((s) => s.flyTarget)

  /* ---- create the map once ---- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLES[useStore.getState().settings.basemap],
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
        setReady(true)
        refresh(true)
      }
    })

    map.on('moveend', () => refresh())

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
      map.fire('moveend') // reuse the same handler path
    }, 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypes, settings.muni, typeIndex, ready])

  /* ---- change basemap ---- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.setStyle(BASEMAP_STYLES[settings.basemap])
    // styledata handler re-adds our layers + refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.basemap])

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

  return <div ref={containerRef} className="map" aria-label="Map of edible plants" />
}
