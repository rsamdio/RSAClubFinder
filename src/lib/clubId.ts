import type { Club } from '../types/club'

/** Trim and strip a single trailing slash from a route param. */
export function normalizeClubIdParam(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.length > 1 && trimmed.endsWith('/')) {
    return trimmed.slice(0, -1)
  }
  return trimmed
}

/**
 * Resolve a club by id without depending on URL casing (Netlify may lowercase paths).
 * Returns the dataset row so callers use the canonical `club_id` casing.
 */
export function findClubById(
  clubs: readonly Club[],
  rawId: string | null | undefined,
): Club | null {
  if (rawId == null) return null
  const id = normalizeClubIdParam(rawId)
  if (!id) return null
  const exact = clubs.find((c) => c.club_id === id)
  if (exact) return exact
  const lower = id.toLowerCase()
  return clubs.find((c) => c.club_id.toLowerCase() === lower) ?? null
}
