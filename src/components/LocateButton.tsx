import { useEffect, useRef, useState } from 'react'
import { CrosshairIcon } from './icons'
import { useStore } from '../store/useStore'

export default function LocateButton() {
  const setUserLocation = useStore((s) => s.setUserLocation)
  const setFlyTarget = useStore((s) => s.setFlyTarget)
  const showToast = useStore((s) => s.showToast)
  const userLocation = useStore((s) => s.userLocation)
  const [tracking, setTracking] = useState(false)
  const [busy, setBusy] = useState(false)
  const watchRef = useRef<number | null>(null)
  const firstFixRef = useRef(true)

  useEffect(
    () => () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    },
    [],
  )

  const stop = () => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setTracking(false)
  }

  const handleClick = () => {
    if (!('geolocation' in navigator)) {
      showToast('Location isn’t available on this device.')
      return
    }
    // Already tracking → just recenter on the latest fix.
    if (tracking && userLocation) {
      setFlyTarget({ ...userLocation, zoom: 16 })
      return
    }
    setBusy(true)
    firstFixRef.current = true
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setBusy(false)
        setTracking(true)
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(
          loc,
          Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
        )
        if (firstFixRef.current) {
          firstFixRef.current = false
          setFlyTarget({ ...loc, zoom: 16 })
        }
      },
      (err) => {
        setBusy(false)
        stop()
        showToast(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied.'
            : 'Couldn’t get your location.',
        )
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 },
    )
  }

  return (
    <button
      className={`fab${tracking ? ' fab--active' : ''}${busy ? ' fab--busy' : ''}`}
      aria-label={tracking ? 'Recenter on my location' : 'Find my location'}
      aria-pressed={tracking}
      onClick={handleClick}
      onDoubleClick={stop}
      title={tracking ? 'Tracking — double-tap to stop' : 'Find my location'}
    >
      <CrosshairIcon />
    </button>
  )
}
