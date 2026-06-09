import { todayISO } from './geo'
import type { FruitingStatus, NewReview, Rating } from './types'

/** Raw form values (strings from <select>/<input>) for a review. */
export interface ReviewFormFields {
  comment?: string
  observed_on?: string
  fruiting?: string
  quality_rating?: string
  yield_rating?: string
  photo_ids?: number[]
}

/**
 * Coerce raw review form fields into a `NewReview`, or `null` if nothing was
 * filled in. Centralizes the empty-string → null and string → enum casts that
 * the add-spot and "add a note" forms both need. `observed_on` defaults to today
 * (the API requires it whenever a review is present).
 */
export function buildReview(f: ReviewFormFields): NewReview | null {
  const comment = f.comment?.trim() || null
  const fruiting = f.fruiting ? (Number(f.fruiting) as FruitingStatus) : null
  const quality_rating = f.quality_rating ? (Number(f.quality_rating) as Rating) : null
  const yield_rating = f.yield_rating ? (Number(f.yield_rating) as Rating) : null
  const photo_ids = f.photo_ids?.length ? f.photo_ids : undefined

  if (!comment && fruiting === null && quality_rating === null && yield_rating === null && !photo_ids) {
    return null
  }
  return {
    comment,
    observed_on: f.observed_on || todayISO(),
    fruiting,
    quality_rating,
    yield_rating,
    photo_ids,
  }
}
