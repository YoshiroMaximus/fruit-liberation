import Sheet from './Sheet'
import { useStore } from '../store/useStore'
import type { BasemapChoice } from '../config'

const BASEMAP_OPTIONS: { value: BasemapChoice; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'liberty', label: 'Field' },
  { value: 'bright', label: 'Bright' },
  { value: 'positron', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/** A labelled segmented control (one choice from a small set). */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="setting-seg">
      <span className="setting-seg__label">{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={value === o.value}
            className={`seg__btn${value === o.value ? ' seg__btn--on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

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

        <Segmented
          label="Distance"
          value={settings.units}
          options={[
            { value: 'imperial', label: 'mi / ft' },
            { value: 'metric', label: 'km / m' },
          ]}
          onChange={(units) => setSettings({ units })}
        />

        <Segmented
          label="Map style"
          value={settings.basemap}
          options={BASEMAP_OPTIONS}
          onChange={(basemap) => setSettings({ basemap })}
        />

        <Segmented
          label="Theme"
          value={settings.theme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(theme) => setSettings({ theme })}
        />
      </div>
    </Sheet>
  )
}
