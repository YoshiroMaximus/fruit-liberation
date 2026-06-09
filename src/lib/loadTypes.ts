import { fetchTypes } from './api'
import { readTypesCache, writeTypesCache } from './storage'
import { buildTypeIndex } from './typeIndex'
import { useStore } from '../store/useStore'

const locale =
  typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en'

let started = false

/** Build the type index from cache immediately, then refresh from the network. */
export async function loadTypes(): Promise<void> {
  if (started) return
  started = true
  const { setTypeIndex, setTypesLoading, setTypesError } = useStore.getState()

  setTypesLoading(true)
  try {
    const cached = await readTypesCache()
    if (cached?.length) {
      setTypeIndex(buildTypeIndex(cached, locale))
      setTypesLoading(false)
    }

    // Always try for fresh data (StaleWhileRevalidate via the service worker too).
    const fresh = await fetchTypes()
    if (fresh?.length) {
      setTypeIndex(buildTypeIndex(fresh, locale))
      void writeTypesCache(fresh)
    }
    setTypesError(null)
  } catch (err) {
    const idx = useStore.getState().typeIndex
    if (!idx) {
      setTypesError(
        err instanceof Error ? err.message : 'Could not load the fruit catalog.',
      )
    }
  } finally {
    setTypesLoading(false)
  }
}
