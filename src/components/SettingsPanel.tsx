import Sheet from './Sheet'
import { useStore } from '../store/useStore'
import type { BasemapChoice } from '../config'

const BASEMAP_OPTIONS: { id: BasemapChoice; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'liberty', label: 'Field' },
  { id: 'bright', label: 'Bright' },
  { id: 'positron', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export default function SettingsPanel() {
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)

  return (
    <Sheet
      open={panel === 'settings'}
      onClose={() => setPanel('none')}
      title="Settings"
      subtitle="Display & map preferences"
    >
      <div className="settings-block">
        <label className="toggle-row">
          <span>
            <strong>Municipal street trees</strong>
            <span className="muted small">Include city tree inventories on the map</span>
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
          <span className="setting-seg__label">Map style</span>
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
