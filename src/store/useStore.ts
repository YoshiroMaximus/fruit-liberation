import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BasemapId } from '../config'
import { STORAGE_KEYS } from '../config'
import type { AuthToken, User } from '../lib/types'
import type { TypeIndex } from '../lib/typeIndex'
import type { LatLng } from '../lib/geo'

export interface SavedSpot {
  id: number
  lat: number
  lng: number
  name: string
  emoji: string
  color: string
  typeIds: number[]
  address?: string | null
  note?: string
  savedAt: number
}

export interface Settings {
  basemap: BasemapId
  units: 'imperial' | 'metric'
  muni: boolean
  theme: 'system' | 'light' | 'dark'
}

export type Panel = 'none' | 'filters' | 'saved' | 'account'

interface PersistedAuth {
  token: AuthToken | null
  acquiredAt: number | null
}

interface AppState {
  // ---- persisted ----
  settings: Settings
  selectedTypes: number[]
  saved: SavedSpot[]
  auth: PersistedAuth

  // ---- transient ----
  typeIndex: TypeIndex | null
  typesLoading: boolean
  typesError: string | null
  user: User | null
  userLocation: LatLng | null
  userHeading: number | null
  locating: boolean
  selectedLocationId: number | null
  panel: Panel
  toast: string | null
  flyTarget: (LatLng & { zoom?: number }) | null
  viewStatus: { mode: 'clusters' | 'locations'; count: number; truncated: boolean } | null

  // ---- actions ----
  setSettings: (partial: Partial<Settings>) => void
  toggleType: (id: number) => void
  addTypes: (ids: number[]) => void
  removeTypes: (ids: number[]) => void
  setSelectedTypes: (ids: number[]) => void
  clearTypes: () => void

  isSaved: (id: number) => boolean
  toggleSaved: (spot: SavedSpot) => void
  removeSaved: (id: number) => void
  setNote: (id: number, note: string) => void

  setTypeIndex: (idx: TypeIndex | null) => void
  setTypesLoading: (loading: boolean) => void
  setTypesError: (err: string | null) => void

  setAuth: (token: AuthToken | null) => void
  setUser: (user: User | null) => void

  setUserLocation: (loc: LatLng | null, heading?: number | null) => void
  setLocating: (locating: boolean) => void

  selectLocation: (id: number | null) => void
  setPanel: (panel: Panel) => void
  showToast: (msg: string | null) => void
  setFlyTarget: (t: (LatLng & { zoom?: number }) | null) => void
  setViewStatus: (v: AppState['viewStatus']) => void
}

const defaultSettings: Settings = {
  basemap: 'liberty',
  units: 'imperial',
  muni: true,
  theme: 'system',
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      selectedTypes: [],
      saved: [],
      auth: { token: null, acquiredAt: null },

      typeIndex: null,
      typesLoading: false,
      typesError: null,
      user: null,
      userLocation: null,
      userHeading: null,
      locating: false,
      selectedLocationId: null,
      panel: 'none',
      toast: null,
      flyTarget: null,
      viewStatus: null,

      setSettings: (partial) => set((s) => ({ settings: { ...s.settings, ...partial } })),

      toggleType: (id) =>
        set((s) => ({
          selectedTypes: s.selectedTypes.includes(id)
            ? s.selectedTypes.filter((t) => t !== id)
            : [...s.selectedTypes, id],
        })),
      addTypes: (ids) =>
        set((s) => ({ selectedTypes: Array.from(new Set([...s.selectedTypes, ...ids])) })),
      removeTypes: (ids) =>
        set((s) => ({ selectedTypes: s.selectedTypes.filter((t) => !ids.includes(t)) })),
      setSelectedTypes: (ids) => set({ selectedTypes: Array.from(new Set(ids)) }),
      clearTypes: () => set({ selectedTypes: [] }),

      isSaved: (id) => get().saved.some((s) => s.id === id),
      toggleSaved: (spot) =>
        set((s) => ({
          saved: s.saved.some((x) => x.id === spot.id)
            ? s.saved.filter((x) => x.id !== spot.id)
            : [{ ...spot, savedAt: Date.now() }, ...s.saved],
        })),
      removeSaved: (id) => set((s) => ({ saved: s.saved.filter((x) => x.id !== id) })),
      setNote: (id, note) =>
        set((s) => ({
          saved: s.saved.map((x) => (x.id === id ? { ...x, note } : x)),
        })),

      setTypeIndex: (typeIndex) => set({ typeIndex }),
      setTypesLoading: (typesLoading) => set({ typesLoading }),
      setTypesError: (typesError) => set({ typesError }),

      setAuth: (token) =>
        set({ auth: { token, acquiredAt: token ? Date.now() : null } }),
      setUser: (user) => set({ user }),

      setUserLocation: (userLocation, userHeading) =>
        set((s) => ({ userLocation, userHeading: userHeading ?? s.userHeading })),
      setLocating: (locating) => set({ locating }),

      selectLocation: (selectedLocationId) => set({ selectedLocationId }),
      setPanel: (panel) => set({ panel }),
      showToast: (toast) => set({ toast }),
      setFlyTarget: (flyTarget) => set({ flyTarget }),
      setViewStatus: (viewStatus) => set({ viewStatus }),
    }),
    {
      name: STORAGE_KEYS.settings,
      version: 1,
      partialize: (s) => ({
        settings: s.settings,
        selectedTypes: s.selectedTypes,
        saved: s.saved,
        auth: s.auth,
      }),
    },
  ),
)
