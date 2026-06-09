import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export default function Toast() {
  const toast = useStore((s) => s.toast)
  const showToast = useStore((s) => s.showToast)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => showToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast, showToast])

  if (!toast) return null
  return (
    <div className="toast" role="status" onClick={() => showToast(null)}>
      {toast}
    </div>
  )
}
