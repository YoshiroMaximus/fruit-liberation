import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from './icons'
import { useDragToDismiss } from '../hooks/useDragToDismiss'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  /** Right-aligned header content (e.g. an action). */
  action?: ReactNode
}

/** A backdrop bottom-sheet (mobile) that becomes a left rail on wide screens. */
export default function Sheet({ open, onClose, title, subtitle, children, action }: SheetProps) {
  const { sheetRef, handleProps } = useDragToDismiss<HTMLElement>(onClose)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet-root" role="dialog" aria-modal="true">
      <div className="sheet-backdrop" onClick={onClose} />
      <section ref={sheetRef} className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__head" {...handleProps}>
          <div className="sheet__handle" />
          <div className="sheet__titles">
            <h2 className="sheet__title">{title}</h2>
            {subtitle && <p className="sheet__subtitle">{subtitle}</p>}
          </div>
          <div className="sheet__head-actions">
            {action}
            <button className="icon-btn" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </header>
        <div className="sheet__body">{children}</div>
      </section>
    </div>
  )
}
