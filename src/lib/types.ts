/** TypeScript models for the Falling Fruit API (v0.3).
 *  See https://github.com/falling-fruit/falling-fruit-api */

export interface Cluster {
  lat: number
  lng: number
  /** Number of location-types (a location with 2 types counts twice). */
  count: number
}

/** Compact location returned by GET /locations (the list endpoint). */
export interface ListLocation {
  id: number
  lat: number
  lng: number
  type_ids: number[]
  /** Present when authenticated: whether the location is in any of the user's lists. */
  in_list?: boolean
  /** Present when `center` is supplied: meters from that center. */
  distance?: number
  /** Path to a review-photo thumbnail when `photo=true`. */
  photo?: string | null
}

export type FruitingStatus = 0 | 1 | 2 // none / unripe / ripe
export type Rating = 0 | 1 | 2 | 3 | 4

export interface Photo {
  id: number
  thumb: string
  medium: string
  original: string
  created_at: string
  updated_at: string
}

export interface Review {
  id: number
  location_id: number
  user_id: number | null
  author: string | null
  comment: string | null
  observed_on: string | null
  fruiting: FruitingStatus | null
  quality_rating: Rating | null
  yield_rating: Rating | null
  created_at: string
  updated_at: string
  photos: Photo[]
}

/** Full location returned by GET /locations/{id}. */
export interface Location {
  id: number
  lat: number
  lng: number
  type_ids: number[]
  user_id: number | null
  author: string | null
  unverified: boolean
  access: 0 | 1 | 2 | 3 | 4 | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  description: string | null
  season_start: number | null // 0-based month
  season_stop: number | null
  muni: boolean
  import_id?: number | null
  reviews?: Review[]
  lists?: LocationList[]
  created_at: string
  updated_at: string
}

export interface FruitType {
  id: number
  parent_id: number | null
  pending: boolean
  scientific_names: string[]
  taxonomic_rank: number | null
  common_names: Record<string, string[]>
  categories: ('forager' | 'freegan' | 'honeybee' | 'grafter')[]
  urls: Record<string, string>
  created_at: string
  updated_at: string
}

export interface TypeCount {
  id: number
  count: number
}

export interface LocationListLocation {
  id: number
  lat: number
  lng: number
  type_ids: number[]
  added_at: string
  address?: string | null
}

export interface LocationList {
  id: number
  name: string
  description?: string | null
  user_id: number
  created_at: string
  updated_at: string
  locations?: LocationListLocation[]
}

/** Body for creating/adding a review. */
export interface NewReview {
  comment?: string | null
  observed_on?: string | null
  fruiting?: FruitingStatus | null
  quality_rating?: Rating | null
  yield_rating?: Rating | null
  photo_ids?: number[]
}

/** Body for creating a new location. */
export interface NewLocation {
  lat: number
  lng: number
  type_ids: number[]
  description?: string | null
  access?: number | null
  season_start?: number | null
  season_stop?: number | null
  unverified?: boolean
  review?: NewReview
}

export interface AuthToken {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  refresh_token: string
}

export interface User {
  id: number
  name: string | null
  bio: string | null
  email: string
  roles: ('user' | 'admin')[]
  confirmed_at: string | null
}

/** Access levels (location.access). */
export const ACCESS_LABELS: Record<number, string> = {
  0: 'On owner property',
  1: 'Permission from owner',
  2: 'Public land',
  3: 'Private but overhangs public',
  4: 'Private property',
}

export const FRUITING_LABELS: Record<number, string> = {
  0: 'Flowers',
  1: 'Unripe fruit',
  2: 'Ripe fruit',
}

/** The quality/yield rating scale (0–4), shared by all review forms. */
export const RATINGS: Rating[] = [0, 1, 2, 3, 4]
