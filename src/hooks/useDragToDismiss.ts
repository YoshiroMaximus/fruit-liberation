import { useRef, useState, type TouchEvent } from 'react'

/**
 * Swipe-down-to-dismiss for bottom sheets. Attach `handleProps` to a drag
 * region (a handle bar / header) and use `dy` to translate the sheet. Releasing
 * past `threshold` px calls `onClose`; otherwise the sheet snaps back.
 */
export function useDragToDismiss(onClose: () => void, threshold = 90) {
  const [dy, setDy] = useState(0)
  const startY = useRef<number | null>(null)

  const onTouchStart = (e: TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? null
  }
  const onTouchMove = (e: TouchEvent) => {
    if (startY.current == null) return
    const delta = (e.touches[0]?.clientY ?? 0) - startY.current
    if (delta > 0) setDy(delta) // only downward
  }
  const onTouchEnd = () => {
    if (dy > threshold) onClose()
    setDy(0)
    startY.current = null
  }

  return {
    dy,
    dragging: dy > 0,
    handleProps: { onTouchStart, onTouchMove, onTouchEnd },
  }
}
