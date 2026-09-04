import Fuse from 'fuse.js'
import type { Club, ClubFilters, ClubWithDistance } from '../types/club'
import { haversineKm } from './haversine'
import type { GeoPoint } from './places'

/** Common alternate spellings users may type. */
const ALIASES: Record<string, string[]> = {
  bangalore: ['bengaluru'],
  bengaluru: ['bangalore'],
  bombay: ['mumbai'],
  mumbai: ['bombay'],
  calcutta: ['kolkata'],
  kolkata: ['calcutta'],
  madras: ['chennai'],
  chennai: ['madras'],
  poona: ['pune'],
  pune: ['poona'],
  male: ['malé', 'male'],
  malé: ['male'],
}

function clubSearchBlob(club: Club): string {
  return [
    club.club_name,
    club.city,
    club.state,
    club.country,
    club.district,
    club.zone,
    club.club_type,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function tokenMatches(blob: string, token: string): boolean {
  const t = token.toLowerCase()
  if (blob.includes(t)) return true
  const aliases = ALIASES[t]
  if (aliases?.some((a) => blob.includes(a))) return true
  return false
}

export function createClubIndex(clubs: Club[]) {
  return new Fuse(clubs, {
    keys: [
      { name: 'club_name', weight: 0.4 },
      { name: 'city', weight: 0.22 },
      { name: 'district', weight: 0.12 },
      { name: 'state', weight: 0.1 },
      { name: 'country', weight: 0.08 },
      { name: 'zone', weight: 0.08 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
  })
}

/**
 * True when the query clearly names a club (substring), not a fuzzy near-miss
 * like "kolar" → Kolkata.
 */
function normalizeSearchText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * True when the query clearly names a club (substring), not a fuzzy near-miss
 * like "kolar" → Kolkata. Short queries (3–4 chars) require a word-boundary hit.
 */
const STOP_WORDS = new Set(['club', 'of', 'the'])

export function hasStrongClubMatch(clubs: Club[], query: string): boolean {
  const q = normalizeSearchText(query)
  if (q.length < 3) return false

  const tokens = q
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))

  return clubs.some((club) => {
    const name = normalizeSearchText(club.club_name)
    if (q.length >= 5 && name.includes(q)) return true

    if (tokens.length > 1) {
      const allTokensMatch = tokens.every((token) => {
        if (token.length >= 4) return name.includes(token)
        const re = new RegExp(`(?:^|\\s)${token}(?:\\s|$)`)
        return re.test(name)
      })
      if (allTokensMatch) return true
    }

    // Short tokens: whole-word only (avoids "nit" matching unrelated noise less,
    // and blocks accidental place->club collisions from tiny substrings).
    const re = new RegExp(`(?:^|\\s)${q}(?:\\s|$)`)
    return re.test(name)
  })
}

export function searchClubs(
  clubs: Club[],
  fuse: Fuse<Club>,
  query: string,
): Club[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2)

  if (tokens.length === 0) return clubs

  if (tokens.length > 1) {
    // Collect fuzzy hits once per token outside the club loop
    const tokenHitSets = tokens.map((token) => {
      const hits = new Set<string>()
      for (const r of fuse.search(token).slice(0, 40)) {
        hits.add(r.item.club_id)
      }
      return hits
    })

    const tokenHits = clubs.filter((club) => {
      const blob = clubSearchBlob(club)
      return tokens.every((token, idx) => {
        if (tokenMatches(blob, token)) return true
        return tokenHitSets[idx].has(club.club_id)
      })
    })
    if (tokenHits.length) return tokenHits
  }

  return fuse.search(query).map((r) => r.item)
}

function applyAttributeFilters(clubs: Club[], filters: ClubFilters): Club[] {
  const { country, state, city, district, zone, type } = filters
  if (!country && !state && !city && !district && !zone && !type) {
    return clubs
  }
  return clubs.filter((c) => {
    if (country && c.country !== country) return false
    if (state && c.state !== state) return false
    if (city && c.city !== city) return false
    if (district && c.district !== district) return false
    if (zone && c.zone !== zone) return false
    if (type && c.club_type !== type) return false
    return true
  })
}

function withDistances(clubs: Club[], origin: GeoPoint): ClubWithDistance[] {
  return clubs
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => ({
      ...c,
      distanceKm: haversineKm(
        origin.lat,
        origin.lng,
        c.latitude as number,
        c.longitude as number,
      ),
    }))
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
}

export interface FilterClubsOptions {
  /** When set, list is distance-sorted from this point (Near Me or place search). */
  origin?: GeoPoint | null
  /** If set with origin, only include clubs within this radius. */
  radiusKm?: number | null
  /** Prefer place-nearby list over text club matches. */
  placeMode?: boolean
  /** Cap ranked nearby results (e.g. nearest N for locality search). */
  maxResults?: number | null
}

export function filterClubs(
  clubs: Club[],
  fuse: Fuse<Club> | null,
  filters: ClubFilters,
  options: FilterClubsOptions = {},
): ClubWithDistance[] {
  const {
    origin = null,
    radiusKm = null,
    placeMode = false,
    maxResults = null,
  } = options
  const query = filters.q.trim()
  let result = applyAttributeFilters(clubs, filters)

  // Place / locate mode: nearby by distance; text uses strong substring only
  if (origin && placeMode) {
    let pool = result

    let ranked = withDistances(pool, origin)
    if (radiusKm != null) {
      ranked = ranked.filter((c) => (c.distanceKm ?? Infinity) <= radiusKm)
    }
    if (maxResults != null && maxResults > 0) {
      ranked = ranked.slice(0, maxResults)
    }
    return ranked
  }

  if (query && fuse) {
    result = searchClubs(result, fuse, query)
  }

  if (origin) {
    return withDistances(result, origin)
  }

  if (query) return result

  return [...result].sort((a, b) => a.club_name.localeCompare(b.club_name))
}

export function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) =>
    a.localeCompare(b),
  )
}
