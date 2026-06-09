import { useMemo } from 'react'
import { FunnelIcon } from './icons'
import { useStore } from '../store/useStore'
import { QUICK_PICKS } from '../lib/typeIndex'

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
        const emoji = ids.length ? typeIndex.byId.get(ids[0])?.emoji ?? '🌱' : '🌱'
        return { kw, ids, emoji }
      })
      .filter((c) => c.ids.length > 0)
  }, [typeIndex])

  const selectedSet = useMemo(() => new Set(selectedTypes), [selectedTypes])

  return (
    <div className="chips">
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
