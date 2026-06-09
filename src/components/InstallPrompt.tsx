import { useEffect, useState } from 'react'
import { PlusIcon, CloseIcon } from './icons'

interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'fl.install.dismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

/** iOS Safari (incl. iPadOS, which masquerades as Macintosh + touch). Excludes
 *  Chrome/Firefox/Edge on iOS, which can't add to the home screen. */
function isIosSafari() {
  const ua = navigator.userAgent
  const ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)
  const realSafari = /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
  return ios && realSafari
}

const ShareBox = () => (
  <svg width="14" height="16" viewBox="0 0 14 17" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 1.5v8" />
    <path d="M4 4.5 7 1.5l3 3" />
    <path d="M3.5 7.5H2v7.5h10V7.5h-1.5" />
  </svg>
)

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [hidden, setHidden] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setEvt(e as BIPEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    // iOS never fires beforeinstallprompt → show a manual hint instead.
    if (!isStandalone() && isIosSafari()) setIos(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (hidden) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setHidden(true)
  }

  if (evt) {
    return (
      <div className="install-chip">
        <button
          className="install-chip__main"
          onClick={async () => {
            await evt.prompt()
            await evt.userChoice
            setEvt(null)
          }}
        >
          <PlusIcon width={16} height={16} />
          Install app
        </button>
        <button className="install-chip__x" aria-label="Dismiss" onClick={dismiss}>
          <CloseIcon width={14} height={14} />
        </button>
      </div>
    )
  }

  if (ios) {
    return (
      <div className="install-chip install-chip--ios">
        <span className="install-chip__hint">
          Install: tap <ShareBox /> then <strong>Add to Home Screen</strong>
        </span>
        <button className="install-chip__x" aria-label="Dismiss" onClick={dismiss}>
          <CloseIcon width={14} height={14} />
        </button>
      </div>
    )
  }

  return null
}
