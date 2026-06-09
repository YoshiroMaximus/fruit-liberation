import { useEffect, useState } from 'react'
import { PlusIcon, CloseIcon } from './icons'

interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'fl.install.dismissed'

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [hidden, setHidden] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setEvt(e as BIPEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!evt || hidden) return null

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
      <button
        className="install-chip__x"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1')
          setHidden(true)
        }}
      >
        <CloseIcon width={14} height={14} />
      </button>
    </div>
  )
}
