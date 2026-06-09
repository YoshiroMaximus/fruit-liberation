import { useEffect, useMemo, useState } from 'react'
import Sheet from './Sheet'
import { CloseIcon } from './icons'
import { useStore } from '../store/useStore'
import { getMap } from '../lib/mapRef'
import { createLocation, uploadPhoto } from '../lib/api'
import { ACCESS_LABELS, type FruitingStatus, type Rating } from '../lib/types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const FRUITING = [
  { v: '0', label: 'Flowers' },
  { v: '1', label: 'Unripe fruit' },
  { v: '2', label: 'Ripe fruit' },
]
const todayISO = () => new Date().toISOString().slice(0, 10)

export default function AddSpotPanel() {
  const setPanel = useStore((s) => s.setPanel)
  const setPlacing = useStore((s) => s.setPlacing)
  const selectLocation = useStore((s) => s.selectLocation)
  const setFlyTarget = useStore((s) => s.setFlyTarget)
  const showToast = useStore((s) => s.showToast)
  const typeIndex = useStore((s) => s.typeIndex)

  const [phase, setPhase] = useState<'place' | 'details'>('place')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const [types, setTypes] = useState<number[]>([])
  const [typeQuery, setTypeQuery] = useState('')
  const [description, setDescription] = useState('')
  const [access, setAccess] = useState('')
  const [seasonStart, setSeasonStart] = useState('')
  const [seasonStop, setSeasonStop] = useState('')

  const [rFruiting, setRFruiting] = useState('')
  const [rObserved, setRObserved] = useState(todayISO())
  const [rQuality, setRQuality] = useState('')
  const [rYield, setRYield] = useState('')
  const [rComment, setRComment] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Enter placement mode on mount; clear it on unmount.
  useEffect(() => {
    setPlacing(true)
    return () => {
      setPlacing(false)
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const results = useMemo(
    () => (typeIndex && typeQuery.trim() ? typeIndex.search(typeQuery, 30) : []),
    [typeIndex, typeQuery],
  )
  const selectedSet = useMemo(() => new Set(types), [types])

  const confirmPlace = () => {
    const m = getMap()
    if (!m) {
      showToast('Map not ready yet')
      return
    }
    const c = m.getCenter()
    setCoords({ lat: c.lat, lng: c.lng })
    setPlacing(false)
    setError(null)
    setPhase('details')
  }

  const backToPlace = () => {
    setPhase('place')
    setPlacing(true)
  }

  const onPhoto = (file: File | null) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  const submit = async () => {
    if (!coords) {
      backToPlace()
      return
    }
    if (types.length === 0) {
      setError('Choose at least one fruit or plant type.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      let photo_ids: number[] | undefined
      if (photoFile) {
        const p = await uploadPhoto(photoFile)
        photo_ids = [p.id]
      }
      const hasReview =
        !!rComment.trim() || rFruiting !== '' || rQuality !== '' || rYield !== '' || !!photo_ids
      const review = hasReview
        ? {
            comment: rComment.trim() || null,
            observed_on: rObserved || todayISO(),
            fruiting: rFruiting === '' ? null : (Number(rFruiting) as FruitingStatus),
            quality_rating: rQuality === '' ? null : (Number(rQuality) as Rating),
            yield_rating: rYield === '' ? null : (Number(rYield) as Rating),
            photo_ids,
          }
        : undefined

      const created = await createLocation({
        lat: coords.lat,
        lng: coords.lng,
        type_ids: types,
        description: description.trim() || null,
        access: access === '' ? null : Number(access),
        season_start: seasonStart === '' ? null : Number(seasonStart),
        season_stop: seasonStop === '' ? null : Number(seasonStop),
        unverified: false,
        review,
      })

      showToast('Spot added — thank you for sharing! 🌱')
      setPanel('none')
      selectLocation(created.id)
      setFlyTarget({ lat: created.lat, lng: created.lng, zoom: 18 })
      getMap()?.fire('moveend') // refresh markers so the new pin appears
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the spot. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === 'place') {
    return (
      <div className="place-bar">
        <div className="place-bar__msg">
          Pan the map so the <strong>crosshair</strong> sits on the plant
        </div>
        <div className="place-bar__actions">
          <button className="btn btn--ghost" onClick={() => setPanel('none')}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={confirmPlace}>
            Set location
          </button>
        </div>
      </div>
    )
  }

  return (
    <Sheet
      open
      onClose={() => setPanel('none')}
      title="Add a spot"
      subtitle={coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : ''}
      action={
        <button className="link-btn" onClick={backToPlace}>
          Move pin
        </button>
      }
    >
      <div className="form-section">
        <label className="form-label">
          What grows here? <span className="req">required</span>
        </label>
        {types.length > 0 && (
          <div className="selected-chips">
            {types.map((id) => {
              const t = typeIndex?.byId.get(id)
              return (
                <button
                  key={id}
                  className="schip"
                  onClick={() => setTypes((p) => p.filter((x) => x !== id))}
                >
                  <span className="schip__emoji" style={{ background: t?.color ?? '#5a9e4b' }}>
                    {t?.emoji ?? '🌱'}
                  </span>
                  {t?.name ?? `#${id}`}
                  <CloseIcon width={13} height={13} />
                </button>
              )
            })}
          </div>
        )}
        <input
          className="field"
          placeholder="Search apple, fig, rosemary…"
          value={typeQuery}
          onChange={(e) => setTypeQuery(e.target.value)}
          autoCorrect="off"
        />
        {results.length > 0 && (
          <div className="type-list type-list--compact">
            {results.map((t) => {
              const on = selectedSet.has(t.id)
              return (
                <button
                  key={t.id}
                  className={`type-row${on ? ' type-row--on' : ''}`}
                  onClick={() =>
                    setTypes((p) => (on ? p.filter((x) => x !== t.id) : [...p, t.id]))
                  }
                >
                  <span className="type-row__emoji" style={{ background: t.color }}>
                    {t.emoji}
                  </span>
                  <span className="type-row__text">
                    <span className="type-row__name">{t.name}</span>
                    {t.scientificName && <span className="type-row__sub">{t.scientificName}</span>}
                  </span>
                  <span className={`checkbox${on ? ' checkbox--on' : ''}`} />
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="form-section">
        <label className="form-label">Details</label>
        <textarea
          className="field"
          rows={2}
          placeholder="Notes — e.g. low branches overhang the sidewalk"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="sub-label">Access</label>
        <select className="field" value={access} onChange={(e) => setAccess(e.target.value)}>
          <option value="">Not sure</option>
          {Object.entries(ACCESS_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <div className="two-col">
          <div>
            <label className="sub-label">Season start</label>
            <select
              className="field"
              value={seasonStart}
              onChange={(e) => setSeasonStart(e.target.value)}
            >
              <option value="">—</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="sub-label">Season end</label>
            <select
              className="field"
              value={seasonStop}
              onChange={(e) => setSeasonStop(e.target.value)}
            >
              <option value="">—</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">
          First sighting <span className="muted small">(optional)</span>
        </label>
        <div className="two-col">
          <div>
            <label className="sub-label">Status</label>
            <select className="field" value={rFruiting} onChange={(e) => setRFruiting(e.target.value)}>
              <option value="">—</option>
              {FRUITING.map((f) => (
                <option key={f.v} value={f.v}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="sub-label">Date seen</label>
            <input
              className="field"
              type="date"
              max={todayISO()}
              value={rObserved}
              onChange={(e) => setRObserved(e.target.value)}
            />
          </div>
        </div>
        <div className="two-col">
          <div>
            <label className="sub-label">Quality</label>
            <select className="field" value={rQuality} onChange={(e) => setRQuality(e.target.value)}>
              <option value="">—</option>
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}/4
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="sub-label">Yield</label>
            <select className="field" value={rYield} onChange={(e) => setRYield(e.target.value)}>
              <option value="">—</option>
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}/4
                </option>
              ))}
            </select>
          </div>
        </div>
        <textarea
          className="field"
          rows={2}
          placeholder="Comment about this sighting"
          value={rComment}
          onChange={(e) => setRComment(e.target.value)}
        />
        <label className="photo-input">
          {photoPreview ? (
            <img src={photoPreview} alt="" className="photo-input__preview" />
          ) : (
            <span className="photo-input__placeholder">📷 Add a photo</span>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button className="btn btn--block btn--primary" onClick={submit} disabled={submitting}>
        {submitting ? 'Adding…' : 'Add spot'}
      </button>
      <p className="muted small" style={{ marginTop: 10, textAlign: 'center' }}>
        Posts to your Falling Fruit account. Please only add real, correctly
        identified plants.
      </p>
    </Sheet>
  )
}
