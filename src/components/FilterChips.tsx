import { useEffect, useMemo, useRef } from 'react'
import { FunnelIcon } from './icons'
import { useStore } from '../store/useStore'
import { FALLBACK, QUICK_PICKS } from '../lib/typeIndex'

export default function FilterChips() {
  const typeIndex = useStore((s) => s.typeIndex)
  const selectedTypes = useStore((s) => s.selectedTypes)
  const addTypes = useStore((s) => s.addTypes)
  const removeTypes = useStore((s) => s.removeTypes)
  const clearTypes = useStore((s) => s.clearTypes)
  const setPanel = useStore((s) => s.setPanel)

  const quick = useMemo(() => {
    if (!typeIndex) return []
    const map = typeIndex.idsForKeywords([...QUICK_PICKS])
    return [...QUICK_PICKS]
      .map((kw) => {
        const ids = map.get(kw) ?? []
        const emoji = (ids.length ? typeIndex.byId.get(ids[0])?.emoji : null) ?? FALLBACK.emoji
        return { kw, ids, emoji }
      })
      .filter((c) => c.ids.length > 0)
  }, [typeIndex])

  const selectedSet = useMemo(() => new Set(selectedTypes), [selectedTypes])

  // Fade the scroll edges (right at the start, both mid-scroll, left at the end)
  // so the row reads as scrollable instead of hard-clipping a chip.
  const scrollerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const update = () => {
      el.classList.toggle('chips--fade-left', el.scrollLeft > 4)
      el.classList.toggle('chips--fade-right', el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [quick])

  return (
    <div className="chips" ref={scrollerRef}>
      <button
        className={`chip chip--filter${selectedTypes.length ? ' chip--has' : ''}`}
        onClick={() => setPanel('filters')}
      >
        <FunnelIcon width={16} height={16} />
        <span>Filters</span>
        {selectedTypes.length > 0 && <span className="chip__badge">{selectedTypes.length}</span>}
      </button>

      {selectedTypes.length > 0 && (
        <button className="chip chip--clear" onClick={clearTypes}>
          Clear
        </button>
      )}

      {quick.map(({ kw, ids, emoji }) => {
        const active = ids.some((id) => selectedSet.has(id))
        return (
          <button
            key={kw}
            className={`chip${active ? ' chip--active' : ''}`}
            onClick={() => (active ? removeTypes(ids) : addTypes(ids))}
          >
            <span className="chip__emoji">{emoji}</span>
            {kw}
          </button>
        )
      })}
    </div>
  )
}
