import { useRegisterSW } from 'virtual:pwa-register/react'

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="pwa-toast" role="alert">
      <span>{needRefresh ? 'A new version is available.' : 'Ready to use offline. 🌱'}</span>
      {needRefresh ? (
        <button className="pwa-toast__btn" onClick={() => updateServiceWorker(true)}>
          Reload
        </button>
      ) : (
        <button className="pwa-toast__btn" onClick={close}>
          Got it
        </button>
      )}
    </div>
  )
}
