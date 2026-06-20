import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { LeafIcon } from './icons'

const SEEN_KEY = 'fl.located.v1'

function hasSeenPrompt() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

/** First-visit card: prime the geolocation prompt, then drop the user on their
 *  own neighborhood instead of the continental-US default view. */
export default function FirstRunLocate() {
  const setUserLocation = useStore((s) => s.setUserLocation)
  const setFlyTarget = useStore((s) => s.setFlyTarget)
  const showToast = useStore((s) => s.showToast)
  const [visible, setVisible] = useState(() => !hasSeenPrompt())
  const [busy, setBusy] = useState(false)
  const locateButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (visible) locateButtonRef.current?.focus()
  }, [visible])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // The prompt can still be dismissed for this session when storage is unavailable.
    }
    setVisible(false)
  }

  const locate = () => {
    if (!('geolocation' in navigator)) {
      dismiss()
      return
    }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc, null)
        setFlyTarget({ ...loc, zoom: 16 })
        dismiss()
      },
      (err) => {
        setBusy(false)
        showToast(
          err.code === err.PERMISSION_DENIED
            ? 'No problem — browse the map freely.'
            : 'Couldn’t get your location.',
        )
        dismiss()
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div className="onboard__card">
        <span className="onboard__badge">
          <LeafIcon width={26} height={26} />
        </span>
        <h2 className="onboard__title" id="onboard-title">
          Find free food near you
        </h2>
        <p className="onboard__text">
          Fruit Liberation maps the edible plants growing in public space around you.
          Share your location to see what’s fruiting on your street.
        </p>
        <button
          ref={locateButtonRef}
          className="btn btn--block btn--primary"
          onClick={locate}
          disabled={busy}
        >
          {busy ? 'Locating…' : 'Use my location'}
        </button>
        <button className="onboard__skip" onClick={dismiss}>
          Maybe later — just browse
        </button>
      </div>
    </div>
  )
}
