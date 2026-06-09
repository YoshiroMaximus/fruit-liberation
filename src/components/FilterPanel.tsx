import { useMemo, useState } from 'react'
import Sheet from './Sheet'
import { CloseIcon } from './icons'
import { useStore } from '../store/useStore'
import type { BasemapChoice } from '../config'

const BASEMAP_OPTIONS: { id: BasemapChoice; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'liberty', label: 'Field' },
  { id: 'bright', label: 'Bright' },
  { id: 'positron', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export default function FilterPanel() {
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  const typeIndex = useStore((s) => s.typeIndex)
  const selectedTypes = useStore((s) => s.selectedTypes)
  const toggleType = useStore((s) => s.toggleType)
  const clearTypes = useStore((s) => s.clearTypes)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)

  const [q, setQ] = useState('')
  const results = useMemo(
    () => (typeIndex && q.trim() ? typeIndex.search(q, 50) : []),
    [typeIndex, q],
  )
  const selectedSet = useMemo(() => new Set(selectedTypes), [selectedTypes])
  const selectedItems = useMemo(
    () => selectedTypes.map((id) => typeIndex?.byId.get(id)).filter(Boolean),
    [selectedTypes, typeIndex],
  )

  return (
    <Sheet
      open={panel === 'filters'}
      onClose={() => setPanel('none')}
      title="Filter the map"
      subtitle={
        selectedTypes.length
          ? `${selectedTypes.length} type${selectedTypes.length > 1 ? 's' : ''} selected`
          : 'Showing everything edible'
      }
      action={
        selectedTypes.length > 0 ? (
          <button className="link-btn" onClick={clearTypes}>
            Clear all
          </button>
        ) : undefined
      }
    >
      {selectedItems.length > 0 && (
        <div className="selected-chips">
          {selectedItems.map(
            (t) =>
              t && (
                <button key={t.id} className="schip" onClick={() => toggleType(t.id)}>
                  <span className="schip__emoji" style={{ background: t.color }}>
                    {t.emoji}
                  </span>
                  {t.name}
                  <CloseIcon width={13} height={13} />
                </button>
              ),
          )}
        </div>
      )}

      <input
        className="field"
        placeholder="Search 4,500+ fruits, nuts, herbs…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoCorrect="off"
      />

      <div className="type-list">
        {!typeIndex && <p className="muted">Loading the catalog…</p>}
        {typeIndex && q.trim() && results.length === 0 && (
          <p className="muted">No matches for “{q.trim()}”.</p>
        )}
        {results.map((t) => {
          const on = selectedSet.has(t.id)
          return (
            <button
              key={t.id}
              className={`type-row${on ? ' type-row--on' : ''}`}
              onClick={() => toggleType(t.id)}
            >
              <span className="type-row__emoji" style={{ background: t.color }}>
                {t.emoji}
              </span>
              <span className="type-row__text">
                <span className="type-row__name">{t.name}</span>
                {t.scientificName && (
                  <span className="type-row__sub">{t.scientificName}</span>
                )}
              </span>
              <span className={`checkbox${on ? ' checkbox--on' : ''}`} />
            </button>
          )
        })}
      </div>

      <div className="divider" />

      <div className="settings-block">
        <label className="toggle-row">
          <span>
            <strong>Municipal street trees</strong>
            <span className="muted small">Include city tree inventories</span>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={settings.muni}
            onChange={(e) => setSettings({ muni: e.target.checked })}
          />
        </label>

        <div className="setting-seg">
          <span className="setting-seg__label">Distance</span>
          <div className="seg">
            {(['imperial', 'metric'] as const).map((u) => (
              <button
                key={u}
                className={`seg__btn${settings.units === u ? ' seg__btn--on' : ''}`}
                onClick={() => setSettings({ units: u })}
              >
                {u === 'imperial' ? 'mi / ft' : 'km / m'}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-seg">
          <span className="setting-seg__label">Map</span>
          <div className="seg">
            {BASEMAP_OPTIONS.map((b) => (
              <button
                key={b.id}
                className={`seg__btn${settings.basemap === b.id ? ' seg__btn--on' : ''}`}
                onClick={() => setSettings({ basemap: b.id })}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-seg">
          <span className="setting-seg__label">Theme</span>
          <div className="seg">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                className={`seg__btn${settings.theme === t ? ' seg__btn--on' : ''}`}
                onClick={() => setSettings({ theme: t })}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
