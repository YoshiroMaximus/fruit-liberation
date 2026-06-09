import { useEffect, useMemo, useState } from 'react'
import { fetchLocation } from '../lib/api'
import type { Location } from '../lib/types'
import { ACCESS_LABELS, FRUITING_LABELS } from '../lib/types'
import { useStore } from '../store/useStore'
import {
  appleMapsUrl,
  formatDistance,
  googleMapsUrl,
  haversine,
  isApplePlatform,
} from '../lib/geo'
import { BookmarkIcon, CloseIcon, NavIcon, ShareIcon } from './icons'

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

function inSeason(month: number, start: number, stop: number) {
  return start <= stop ? month >= start && month <= stop : month >= start || month <= stop
}

export default function LocationSheet() {
  const id = useStore((s) => s.selectedLocationId)
  const selectLocation = useStore((s) => s.selectLocation)
  const typeIndex = useStore((s) => s.typeIndex)
  const userLocation = useStore((s) => s.userLocation)
  const units = useStore((s) => s.settings.units)
  const isSaved = useStore((s) => s.isSaved)
  const toggleSaved = useStore((s) => s.toggleSaved)
  const showToast = useStore((s) => s.showToast)

  const [loc, setLoc] = useState<Location | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id == null) {
      setLoc(null)
      setError(null)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    setLoc(null)
    fetchLocation(id, ['reviews'], ac.signal)
      .then((d) => setLoc(d))
      .catch((e) => {
        if (e?.name !== 'AbortError') setError(e?.message ?? 'Could not load this spot.')
      })
      .finally(() => setLoading(false))
    return () => ac.abort()
  }, [id])

  const primary = loc?.type_ids?.[0]
  const indexed = primary != null ? typeIndex?.byId.get(primary) : undefined
  const names = useMemo(
    () => (loc && typeIndex ? typeIndex.names(loc.type_ids) : []),
    [loc, typeIndex],
  )
  const photo = useMemo(
    () => loc?.reviews?.flatMap((r) => r.photos)?.find(Boolean),
    [loc],
  )
  const latestReview = useMemo(
    () =>
      loc?.reviews
        ?.filter((r) => r.observed_on)
        .sort((a, b) => (a.observed_on! < b.observed_on! ? 1 : -1))[0],
    [loc],
  )

  if (id == null) return null

  const saved = loc ? isSaved(loc.id) : false
  const distance =
    loc && userLocation ? haversine(userLocation, { lat: loc.lat, lng: loc.lng }) : null

  const onSave = () => {
    if (!loc) return
    toggleSaved({
      id: loc.id,
      lat: loc.lat,
      lng: loc.lng,
      name: indexed?.name ?? names[0] ?? 'Edible plant',
      emoji: indexed?.emoji ?? '🌱',
      color: indexed?.color ?? '#5a9e4b',
      typeIds: loc.type_ids,
      address: loc.address,
      savedAt: Date.now(),
    })
    showToast(saved ? 'Removed from saved' : 'Saved to your spots')
  }

  const onShare = async () => {
    if (!loc) return
    const url = `https://fallingfruit.org/locations/${loc.id}`
    const title = `${indexed?.emoji ?? '🌱'} ${indexed?.name ?? 'Edible plant'} on Fruit Liberation`
    try {
      if (navigator.share) await navigator.share({ title, url })
      else {
        await navigator.clipboard.writeText(url)
        showToast('Link copied')
      }
    } catch {
      /* user cancelled */
    }
  }

  const stops = loc ? [{ lat: loc.lat, lng: loc.lng }] : []
  const gUrl = googleMapsUrl(userLocation, stops, 'walking')
  const aUrl = appleMapsUrl(userLocation, stops, 'w')

  return (
    <div className="locsheet" role="dialog" aria-label="Location details">
      <button className="locsheet__close icon-btn" aria-label="Close" onClick={() => selectLocation(null)}>
        <CloseIcon />
      </button>

      {loading && <div className="locsheet__loading">Loading spot…</div>}
      {error && <div className="locsheet__loading">{error}</div>}

      {loc && (
        <>
          <div className="locsheet__head">
            <span className="locsheet__emoji" style={{ background: indexed?.color ?? '#5a9e4b' }}>
              {indexed?.emoji ?? '🌱'}
            </span>
            <div className="locsheet__title-wrap">
              <h2 className="locsheet__title">{names[0] ?? 'Edible plant'}</h2>
              {names.length > 1 && (
                <p className="locsheet__alt">{names.slice(1).join(' · ')}</p>
              )}
            </div>
          </div>

          <div className="pillrow">
            {distance != null && (
              <span className="pill pill--mono">{formatDistance(distance, units === 'imperial')} away</span>
            )}
            {latestReview && latestReview.fruiting != null && (
              <span className="pill pill--ripe">
                {FRUITING_LABELS[latestReview.fruiting]} · {latestReview.observed_on}
              </span>
            )}
            {loc.access != null && <span className="pill">{ACCESS_LABELS[loc.access]}</span>}
            {loc.muni && <span className="pill pill--muni">City tree</span>}
            {loc.unverified && <span className="pill pill--warn">Unverified</span>}
          </div>

          {(loc.address || loc.city) && (
            <p className="locsheet__addr">{loc.address ?? loc.city}</p>
          )}

          {loc.season_start != null && loc.season_stop != null && (
            <div className="season">
              <span className="season__label">In season</span>
              <div className="season__strip">
                {MONTHS.map((m, i) => (
                  <span
                    key={i}
                    className={`season__cell${inSeason(i, loc.season_start!, loc.season_stop!) ? ' season__cell--on' : ''}`}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {photo && (
            <img className="locsheet__photo" src={photo.medium} alt="" loading="lazy" />
          )}

          {loc.description && <p className="locsheet__desc">{loc.description}</p>}

          {loc.reviews && loc.reviews.length > 0 && (
            <div className="reviews">
              <div className="reviews__label">
                {loc.reviews.length} note{loc.reviews.length > 1 ? 's' : ''}
              </div>
              {loc.reviews.slice(0, 4).map((r) => (
                <div key={r.id} className="review">
                  <div className="review__meta">
                    <span className="review__author">{r.author ?? 'Forager'}</span>
                    {r.observed_on && <span className="review__date">{r.observed_on}</span>}
                  </div>
                  {r.comment && <p className="review__comment">{r.comment}</p>}
                  <div className="review__tags">
                    {r.fruiting != null && (
                      <span className="tag">{FRUITING_LABELS[r.fruiting]}</span>
                    )}
                    {r.quality_rating != null && (
                      <span className="tag">Quality {r.quality_rating}/4</span>
                    )}
                    {r.yield_rating != null && (
                      <span className="tag">Yield {r.yield_rating}/4</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="locsheet__actions">
            <button
              className={`btn btn--save${saved ? ' btn--saved' : ''}`}
              onClick={onSave}
            >
              <BookmarkIcon width={18} height={18} />
              {saved ? 'Saved' : 'Save'}
            </button>
            <a
              className="btn btn--primary"
              href={isApplePlatform() ? aUrl : gUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <NavIcon width={18} height={18} />
              Walk here
            </a>
            <button className="btn btn--ghost" onClick={onShare} aria-label="Share">
              <ShareIcon width={18} height={18} />
            </button>
          </div>

          <div className="locsheet__links">
            <a href={gUrl} target="_blank" rel="noopener noreferrer">Google Maps</a>
            <span>·</span>
            <a href={aUrl} target="_blank" rel="noopener noreferrer">Apple Maps</a>
            <span>·</span>
            <a
              href={`https://fallingfruit.org/locations/${loc.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Falling Fruit
            </a>
          </div>
        </>
      )}
    </div>
  )
}
