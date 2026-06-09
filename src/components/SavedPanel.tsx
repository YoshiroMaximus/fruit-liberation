import { useEffect, useMemo, useState } from 'react'
import Sheet from './Sheet'
import { NavIcon, TrashIcon, RouteIcon } from './icons'
import { useStore } from '../store/useStore'
import {
  appleMapsUrl,
  formatDistance,
  googleMapsUrl,
  haversine,
  nearestNeighborOrder,
  totalRouteDistance,
} from '../lib/geo'
import { addLocationToList, createList, fetchLists } from '../lib/api'
import type { LocationList } from '../lib/types'

export default function SavedPanel() {
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  const saved = useStore((s) => s.saved)
  const removeSaved = useStore((s) => s.removeSaved)
  const userLocation = useStore((s) => s.userLocation)
  const units = useStore((s) => s.settings.units)
  const setFlyTarget = useStore((s) => s.setFlyTarget)
  const selectLocation = useStore((s) => s.selectLocation)
  const user = useStore((s) => s.user)
  const showToast = useStore((s) => s.showToast)

  const [optimize, setOptimize] = useState(true)
  const [lists, setLists] = useState<LocationList[] | null>(null)
  const [syncing, setSyncing] = useState(false)

  const open = panel === 'saved'

  useEffect(() => {
    if (!open || !user) return
    fetchLists(false)
      .then(setLists)
      .catch(() => setLists(null))
  }, [open, user])

  const orderedSaved = useMemo(() => {
    if (optimize && userLocation && saved.length > 1) {
      return nearestNeighborOrder(userLocation, saved)
    }
    return saved
  }, [optimize, userLocation, saved])

  const stops = orderedSaved.map((s) => ({ lat: s.lat, lng: s.lng }))
  const routeMeters = totalRouteDistance(userLocation, stops)
  const gUrl = googleMapsUrl(userLocation, stops, 'walking')
  const aUrl = appleMapsUrl(userLocation, stops, 'w')

  const goTo = (lat: number, lng: number, id: number) => {
    selectLocation(id)
    setFlyTarget({ lat, lng, zoom: 17 })
    setPanel('none')
  }

  const syncToFallingFruit = async () => {
    if (!saved.length) return
    setSyncing(true)
    try {
      const list = await createList(
        `Fruit Liberation picks`,
        `${saved.length} spots saved from Fruit Liberation`,
      )
      for (const s of saved) {
        try {
          await addLocationToList(s.id, list.id)
        } catch {
          /* skip individual failures (e.g. already in list) */
        }
      }
      showToast(`Synced ${saved.length} spots to Falling Fruit`)
      fetchLists(false).then(setLists).catch(() => {})
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => setPanel('none')}
      title="Your spots"
      subtitle={
        saved.length
          ? `${saved.length} saved${userLocation ? '' : ' · enable location for a route'}`
          : 'Nothing saved yet'
      }
    >
      {saved.length === 0 && (
        <div className="empty">
          <p className="empty__emoji">🧺</p>
          <p className="empty__title">No spots saved yet</p>
          <p className="muted">
            Tap any fruit on the map and hit <strong>Save</strong>. Saved spots live on this
            device and work offline.
          </p>
        </div>
      )}

      {saved.length > 0 && (
        <>
          <div className="route-card">
            <div className="route-card__top">
              <RouteIcon width={18} height={18} />
              <div className="route-card__info">
                <strong>
                  Walking route{routeMeters > 0 ? ` · ${formatDistance(routeMeters, units === 'imperial')}` : ''}
                </strong>
                <span className="muted small">
                  {stops.length} stop{stops.length > 1 ? 's' : ''}
                  {stops.length > 10 ? ' · maps may cap at 10' : ''}
                </span>
              </div>
              <label className="mini-toggle">
                <input
                  type="checkbox"
                  checked={optimize}
                  onChange={(e) => setOptimize(e.target.checked)}
                  disabled={!userLocation}
                />
                Optimize
              </label>
            </div>
            <div className="route-card__actions">
              <a className="btn btn--primary" href={gUrl} target="_blank" rel="noopener noreferrer">
                <NavIcon width={16} height={16} /> Google Maps
              </a>
              <a className="btn btn--ghost" href={aUrl} target="_blank" rel="noopener noreferrer">
                Apple Maps
              </a>
            </div>
          </div>

          <ol className="saved-list">
            {orderedSaved.map((s, i) => {
              const dist = userLocation ? haversine(userLocation, s) : null
              return (
                <li key={s.id} className="saved-item">
                  <span className="saved-item__index">{i + 1}</span>
                  <button className="saved-item__main" onClick={() => goTo(s.lat, s.lng, s.id)}>
                    <span className="saved-item__emoji" style={{ background: s.color }}>
                      {s.emoji}
                    </span>
                    <span className="saved-item__text">
                      <span className="saved-item__name">{s.name}</span>
                      <span className="muted small">
                        {dist != null ? `${formatDistance(dist, units === 'imperial')} · ` : ''}
                        {s.address ?? `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`}
                      </span>
                    </span>
                  </button>
                  <button
                    className="icon-btn icon-btn--sm"
                    aria-label={`Remove ${s.name}`}
                    onClick={() => removeSaved(s.id)}
                  >
                    <TrashIcon width={18} height={18} />
                  </button>
                </li>
              )
            })}
          </ol>

          {user ? (
            <div className="sync-block">
              <button className="btn btn--block" onClick={syncToFallingFruit} disabled={syncing}>
                {syncing ? 'Syncing…' : 'Sync to my Falling Fruit account'}
              </button>
              {lists && lists.length > 0 && (
                <p className="muted small">
                  Your lists: {lists.map((l) => l.name).join(', ')}
                </p>
              )}
            </div>
          ) : (
            <p className="muted small sync-block">
              Sign in to sync these spots to your Falling Fruit account across devices.
            </p>
          )}
        </>
      )}
    </Sheet>
  )
}
