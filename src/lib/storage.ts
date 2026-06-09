import { get, set, del } from 'idb-keyval'
import { STORAGE_KEYS, TYPES_TTL_MS } from '../config'
import type { FruitType } from './types'

interface TypesCache {
  fetchedAt: number
  types: FruitType[]
}

/** Read the cached type catalog if present and fresh. */
export async function readTypesCache(): Promise<FruitType[] | null> {
  try {
    const cached = await get<TypesCache>(STORAGE_KEYS.typesCache)
    if (!cached) return null
    if (Date.now() - cached.fetchedAt > TYPES_TTL_MS) return null
    return cached.types
  } catch {
    return null
  }
}

export async function writeTypesCache(types: FruitType[]): Promise<void> {
  try {
    await set(STORAGE_KEYS.typesCache, { fetchedAt: Date.now(), types } satisfies TypesCache)
  } catch {
    /* storage full / unavailable – non-fatal */
  }
}

export async function clearTypesCache(): Promise<void> {
  try {
    await del(STORAGE_KEYS.typesCache)
  } catch {
    /* ignore */
  }
}
