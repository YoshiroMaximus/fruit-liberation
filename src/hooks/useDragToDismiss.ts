import { useRef, type TouchEvent } from 'react'

/**
 * Swipe-down-to-dismiss for bottom sheets. Attach `sheetRef` to the sheet
 * element and `handleProps` to a drag region (handle bar / header). Releasing
 * past `threshold` px calls `onClose`; otherwise the sheet animates back.
 *
 * The transform is written straight to the DOM node during the drag (no React
 * state), so the sheet doesn't re-render on every touchmove frame.
 */
export function useDragToDismiss<T extends HTMLElement = HTMLElement>(
  onClose: () => void,
  threshold = 90,
) {
  const sheetRef = useRef<T | null>(null)
  const startY = useRef<number | null>(null)
  const dy = useRef(0)

  const move = (delta: number, animate: boolean) => {
    const el = sheetRef.current
    if (!el) return
    el.style.transition = animate ? '' : 'none'
    el.style.transform = delta ? `translateY(${delta}px)` : ''
  }

  const onTouchStart = (e: TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? null
  }
  const onTouchMove = (e: TouchEvent) => {
    if (startY.current == null) return
    dy.current = Math.max(0, (e.touches[0]?.clientY ?? 0) - startY.current)
    move(dy.current, false) // follow the finger, no transition
  }
  const onTouchEnd = () => {
    const released = dy.current
    dy.current = 0
    startY.current = null
    if (released > threshold) onClose()
    else move(0, true) // animated snap-back (CSS transition restored)
  }

  return { sheetRef, handleProps: { onTouchStart, onTouchMove, onTouchEnd } }
}
