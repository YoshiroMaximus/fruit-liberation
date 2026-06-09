import { useState } from 'react'
import { CATEGORIES } from '../lib/typeIndex'

/** Collapsible map key: what each marker color/emoji means. */
export default function Legend() {
  const [open, setOpen] = useState(false)

  return (
    <div className="legend">
      {open && (
        <div className="legend__card" role="dialog" aria-label="Map key">
          <div className="legend__title">Map key</div>
          {CATEGORIES.map((c) => (
            <div key={c.key} className="legend__row">
              <span className="legend__swatch" style={{ background: c.color }}>
                {c.emoji}
              </span>
              {c.label}
            </div>
          ))}
        </div>
      )}
      <button
        className={`legend__toggle${open ? ' legend__toggle--on' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="legend__dots" aria-hidden>
          {CATEGORIES.slice(0, 4).map((c) => (
            <span key={c.key} style={{ background: c.color }} />
          ))}
        </span>
        {open ? 'Close' : 'Key'}
      </button>
    </div>
  )
}
