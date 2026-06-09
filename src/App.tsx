import { useEffect } from 'react'
import MapView from './components/MapView'
import SearchBar from './components/SearchBar'
import FilterChips from './components/FilterChips'
import FilterPanel from './components/FilterPanel'
import LocationSheet from './components/LocationSheet'
import SavedPanel from './components/SavedPanel'
import AccountPanel from './components/AccountPanel'
import AddSpotPanel from './components/AddSpotPanel'
import LocateButton from './components/LocateButton'
import Toast from './components/Toast'
import ReloadPrompt from './components/ReloadPrompt'
import InstallPrompt from './components/InstallPrompt'
import { BookmarkIcon, UserIcon, PlusIcon } from './components/icons'
import { useStore } from './store/useStore'
import { loadTypes } from './lib/loadTypes'

function useTheme() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const resolved =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme
      root.dataset.theme = resolved
      root
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', resolved === 'dark' ? '#0f1511' : '#1f3d2b')
    }
    apply()
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [theme])
}

export default function App() {
  useTheme()
  const selectedLocationId = useStore((s) => s.selectedLocationId)
  const savedCount = useStore((s) => s.saved.length)
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  const placing = useStore((s) => s.placing)
  const user = useStore((s) => s.user)
  const showToast = useStore((s) => s.showToast)
  const viewStatus = useStore((s) => s.viewStatus)
  const typesError = useStore((s) => s.typesError)
  const typeIndex = useStore((s) => s.typeIndex)

  const onAdd = () => {
    if (user) setPanel('add')
    else {
      showToast('Sign in to add a spot')
      setPanel('account')
    }
  }

  useEffect(() => {
    void loadTypes()
  }, [])

  const status = viewStatus
    ? viewStatus.mode === 'clusters'
      ? `${viewStatus.count.toLocaleString()} nearby — zoom in`
      : `${viewStatus.count.toLocaleString()} spot${viewStatus.count === 1 ? '' : 's'}${
          viewStatus.truncated ? ' · zoom in for all' : ''
        }`
    : null

  return (
    <div className="app">
      <MapView />

      <div className="topbar">
        <SearchBar />
        <FilterChips />
        {status && <div className="statuspill">{status}</div>}
        {typesError && !typeIndex && (
          <div className="statuspill statuspill--err">{typesError}</div>
        )}
      </div>

      {placing && (
        <div className="crosshair" aria-hidden>
          <span className="crosshair__ring" />
          <span className="crosshair__dot" />
        </div>
      )}

      <div className="rail">
        {!placing && panel !== 'add' && (
          <button className="fab fab--accent" aria-label="Add a spot" onClick={onAdd}>
            <PlusIcon />
          </button>
        )}
        <LocateButton />
      </div>

      {selectedLocationId == null && !placing && (
        <nav className="dock">
          <button className="dock__btn" onClick={() => setPanel('saved')}>
            <BookmarkIcon width={20} height={20} />
            <span>Saved{savedCount ? ` · ${savedCount}` : ''}</span>
          </button>
          <button className="dock__btn" onClick={() => setPanel('account')}>
            <UserIcon width={20} height={20} />
            <span>Account</span>
          </button>
        </nav>
      )}

      <LocationSheet />
      <FilterPanel />
      <SavedPanel />
      <AccountPanel />
      {panel === 'add' && <AddSpotPanel />}

      <InstallPrompt />
      <Toast />
      <ReloadPrompt />
    </div>
  )
}
