import { API_BASE } from '../config'
import type {
  AuthToken,
  Cluster,
  FruitType,
  ListLocation,
  Location,
  LocationList,
  Review,
  TypeCount,
  User,
} from './types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

/** Injected by the auth module to provide a valid access token on demand. */
let tokenProvider: (() => Promise<string | null>) | null = null
export function configureAuth(provider: () => Promise<string | null>) {
  tokenProvider = provider
}

interface RequestOptions {
  method?: string
  /** Attach the user's bearer token (and retry once after refresh on 401). */
  auth?: boolean
  /** Send the bearer token if available, but don't require it. */
  optionalAuth?: boolean
  body?: BodyInit
  headers?: Record<string, string>
  signal?: AbortSignal
  /** Parse + return the `x-total-count` header alongside the body. */
  wantTotal?: boolean
}

async function request<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<{ data: T; total: number | null }> {
  const headers: Record<string, string> = { ...opts.headers }

  if ((opts.auth || opts.optionalAuth) && tokenProvider) {
    const token = await tokenProvider()
    if (token) headers.Authorization = `Bearer ${token}`
    else if (opts.auth) throw new ApiError(401, 'You need to sign in for that.')
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body,
    signal: opts.signal,
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const err = await res.json()
      if (err?.error) message = err.error
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message)
  }

  const total = opts.wantTotal ? Number(res.headers.get('x-total-count')) : null
  if (res.status === 204) return { data: undefined as T, total }
  const data = (await res.json()) as T
  return { data, total: Number.isFinite(total) ? total : null }
}

/* ----------------------------- helpers ----------------------------- */

export function boundsParam(b: {
  west: number
  south: number
  east: number
  north: number
}): string {
  return `${b.south},${b.west}|${b.north},${b.east}`
}

function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

/* ----------------------------- public data ----------------------------- */

export async function fetchTypes(signal?: AbortSignal): Promise<FruitType[]> {
  return (await request<FruitType[]>('/types', { signal })).data
}

export async function fetchTypeCounts(
  bounds: string,
  opts: { muni?: boolean; zoom?: number } = {},
  signal?: AbortSignal,
): Promise<TypeCount[]> {
  return (
    await request<TypeCount[]>(
      `/types/counts${qs({ bounds, muni: opts.muni, zoom: opts.zoom })}`,
      { signal },
    )
  ).data
}

export async function fetchClusters(
  args: { bounds: string; zoom: number; types?: number[]; muni?: boolean },
  signal?: AbortSignal,
): Promise<Cluster[]> {
  const query = qs({
    bounds: args.bounds,
    zoom: args.zoom,
    muni: args.muni,
    types: args.types && args.types.length ? args.types.join(',') : undefined,
  })
  return (await request<Cluster[]>(`/clusters${query}`, { signal })).data
}

export async function fetchLocations(
  args: {
    bounds?: string
    center?: string
    types?: number[]
    muni?: boolean
    invasive?: boolean
    limit?: number
    offset?: number
    photo?: boolean
    count?: boolean
  },
  signal?: AbortSignal,
): Promise<{ data: ListLocation[]; total: number | null }> {
  const query = qs({
    bounds: args.bounds,
    center: args.center,
    muni: args.muni,
    invasive: args.invasive,
    limit: args.limit,
    offset: args.offset,
    photo: args.photo,
    count: args.count,
    types: args.types && args.types.length ? args.types.join(',') : undefined,
  })
  return request<ListLocation[]>(`/locations${query}`, {
    signal,
    optionalAuth: true,
    wantTotal: args.count,
  })
}

export async function fetchLocation(
  id: number,
  embed: ('reviews' | 'import')[] = ['reviews'],
  signal?: AbortSignal,
): Promise<Location> {
  const query = qs({ embed: embed.length ? embed.join(',') : undefined })
  return (
    await request<Location>(`/locations/${id}${query}`, { signal, optionalAuth: true })
  ).data
}

export async function fetchReviews(id: number, signal?: AbortSignal): Promise<Review[]> {
  return (await request<Review[]>(`/locations/${id}/reviews`, { signal })).data
}

/* ----------------------------- auth ----------------------------- */

export async function login(email: string, password: string): Promise<AuthToken> {
  const form = new FormData()
  form.set('username', email)
  form.set('password', password)
  return (await request<AuthToken>('/user/token', { method: 'POST', body: form })).data
}

export async function refreshToken(refresh_token: string): Promise<AuthToken> {
  const form = new FormData()
  form.set('grant_type', 'refresh_token')
  form.set('refresh_token', refresh_token)
  return (
    await request<AuthToken>('/user/token/refresh', { method: 'POST', body: form })
  ).data
}

export async function fetchUser(): Promise<User> {
  return (await request<User>('/user', { auth: true })).data
}

/* ----------------------------- location lists ----------------------------- */

export async function fetchLists(withLocations = true): Promise<LocationList[]> {
  const query = qs({ embed: withLocations ? 'locations' : undefined })
  return (await request<LocationList[]>(`/locations/lists${query}`, { auth: true })).data
}

export async function createList(
  name: string,
  description?: string,
): Promise<LocationList> {
  return (
    await request<LocationList>('/locations/lists', {
      method: 'POST',
      auth: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
  ).data
}

export async function addLocationToList(locationId: number, listId: number): Promise<void> {
  await request<void>(`/locations/${locationId}/lists/${listId}`, {
    method: 'POST',
    auth: true,
  })
}

export async function removeLocationFromList(
  locationId: number,
  listId: number,
): Promise<void> {
  await request<void>(`/locations/${locationId}/lists/${listId}`, {
    method: 'DELETE',
    auth: true,
  })
}

export async function deleteList(listId: number): Promise<void> {
  await request<void>(`/locations/lists/${listId}`, { method: 'DELETE', auth: true })
}
