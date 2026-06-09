import { useMemo, useRef, useState } from 'react'
import { LeafIcon, SearchIcon, PinIcon, CloseIcon } from './icons'
import { useStore } from '../store/useStore'
import { geocodePlace, type Place } from '../lib/geocode'

export default function SearchBar() {
  const typeIndex = useStore((s) => s.typeIndex)
  const addTypes = useStore((s) => s.addTypes)
  const setFlyTarget = useStore((s) => s.setFlyTarget)
  const showToast = useStore((s) => s.showToast)

  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const [places, setPlaces] = useState<Place[]>([])
  const [placeLoading, setPlaceLoading] = useState(false)
  const acRef = useRef<AbortController | null>(null)
  const blurTimer = useRef<number | undefined>(undefined)

  const typeMatches = useMemo(
    () => (typeIndex && q.trim() ? typeIndex.search(q, 8) : []),
    [typeIndex, q],
  )

  const runPlaceSearch = async () => {
    if (q.trim().length < 2) return
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setPlaceLoading(true)
    try {
      setPlaces(await geocodePlace(q, ac.signal))
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError')
        showToast('Place search failed — try again.')
    } finally {
      setPlaceLoading(false)
    }
  }

  const pickType = (id: number, name: string) => {
    addTypes([id])
    showToast(`Filtering for ${name}`)
    reset()
  }

  const pickPlace = (p: Place) => {
    setFlyTarget({ lat: p.lat, lng: p.lng, zoom: 14 })
    reset()
  }

  const reset = () => {
    setQ('')
    setPlaces([])
    setFocused(false)
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  const open = focused && q.trim().length > 0

  return (
    <div className="searchbar">
      <div className="searchbar__brand" aria-hidden>
        <LeafIcon width={20} height={20} />
      </div>
      <form
        className="searchbar__form"
        onSubmit={(e) => {
          e.preventDefault()
          void runPlaceSearch()
        }}
      >
        <SearchIcon className="searchbar__icon" width={18} height={18} />
        <input
          className="searchbar__input"
          placeholder="Search fruit or a place…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            window.clearTimeout(blurTimer.current)
            setFocused(true)
          }}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setFocused(false), 150)
          }}
          enterKeyHint="search"
          autoCorrect="off"
          autoComplete="off"
        />
        {q && (
          <button
            type="button"
            className="searchbar__clear"
            aria-label="Clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setQ('')}
          >
            <CloseIcon width={16} height={16} />
          </button>
        )}
      </form>

      {open && (
        <div className="searchbar__results">
          {typeMatches.length > 0 && (
            <div className="results-group">
              <div className="results-group__label">Fruit & plants</div>
              {typeMatches.map((t) => (
                <button
                  key={t.id}
                  className="result"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickType(t.id, t.name)}
                >
                  <span className="result__emoji" style={{ background: t.color }}>
                    {t.emoji}
                  </span>
                  <span className="result__text">
                    <span className="result__name">{t.name}</span>
                    {t.scientificName && (
                      <span className="result__sub">{t.scientificName}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="results-group">
            <div className="results-group__label">Places</div>
            <button
              className="result result--action"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void runPlaceSearch()}
            >
              <span className="result__emoji result__emoji--ghost">
                <PinIcon width={16} height={16} />
              </span>
              <span className="result__text">
                <span className="result__name">
                  {placeLoading ? 'Searching…' : `Find “${q.trim()}”`}
                </span>
              </span>
            </button>
            {places.map((p, i) => (
              <button
                key={i}
                className="result"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickPlace(p)}
              >
                <span className="result__emoji result__emoji--ghost">
                  <PinIcon width={16} height={16} />
                </span>
                <span className="result__text">
                  <span className="result__name result__name--place">{p.name}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
