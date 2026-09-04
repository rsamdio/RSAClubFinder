import type { Club } from '../types/club'
import { haversineKm } from './haversine'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface PlaceFocus extends GeoPoint {
  label: string
  /** user = GPS, place = Mapbox geocode, city = city centroid from clubs, map = map center browse */
  source: 'user' | 'place' | 'city' | 'map'
  zoom: number
  city?: string
}

export interface CityPlace {
  key: string
  label: string
  city: string
  state: string | null
  country: string
  lat: number
  lng: number
  clubCount: number
}

/** Tiny alias map only - not a locality gazetteer. */
export const CITY_ALIASES: Record<string, string> = {
  bangalore: 'bengaluru',
  bengaluru: 'bengaluru',
  bombay: 'mumbai',
  mumbai: 'mumbai',
  calcutta: 'kolkata',
  kolkata: 'kolkata',
  madras: 'chennai',
  chennai: 'chennai',
  poona: 'pune',
  pune: 'pune',
  male: 'malé',
  malé: 'malé',
}

export function normalizePlaceText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Build searchable city centroids from club coordinates. */
export function buildCityIndex(clubs: Club[]): CityPlace[] {
  const buckets = new Map<
    string,
    {
      city: string
      state: string | null
      country: string
      lats: number[]
      lngs: number[]
    }
  >()

  for (const club of clubs) {
    if (club.latitude == null || club.longitude == null) continue
    const cityKey = normalizePlaceText(club.city)
    const countryKey = normalizePlaceText(club.country)
    const key = countryKey ? `${cityKey}|${countryKey}` : cityKey
    const bucket = buckets.get(key) ?? {
      city: club.city,
      state: club.state,
      country: club.country,
      lats: [],
      lngs: [],
    }
    bucket.lats.push(club.latitude)
    bucket.lngs.push(club.longitude)
    buckets.set(key, bucket)
  }

  return [...buckets.entries()].map(([key, b]) => ({
    key,
    label: [b.city, b.state, b.country].filter(Boolean).join(', '),
    city: b.city,
    state: b.state,
    country: b.country,
    lat: b.lats.reduce((a, n) => a + n, 0) / b.lats.length,
    lng: b.lngs.reduce((a, n) => a + n, 0) / b.lngs.length,
    clubCount: b.lats.length,
  }))
}

/** Instant city match from dataset (no network). */
export function matchCityPlace(
  query: string,
  cities: CityPlace[],
): PlaceFocus | null {
  const q = normalizePlaceText(query)
  if (q.length < 2) return null

  const aliasTarget = CITY_ALIASES[q]
  const tokens = q.split(' ').filter((t) => t.length >= 2)

  let best: CityPlace | null = null
  let bestScore = 0

  for (const city of cities) {
    const name = normalizePlaceText(city.city)
    const aliased = CITY_ALIASES[name] ?? name
    let score = 0

    if (q === name || q === aliased || aliasTarget === name) score = 100
    else if (tokens.length === 1 && (name === tokens[0] || aliased === tokens[0]))
      score = 100
    else if (name.startsWith(q) || aliased.startsWith(q)) score = 80
    else if (q.includes(name) || (aliasTarget && q.includes(aliasTarget))) score = 40
    else if (
      tokens.some((t) => name === t || aliased === t || CITY_ALIASES[t] === name)
    )
      score = 50

    if (score > bestScore) {
      bestScore = score
      best = city
    }
  }

  // Exact/near-exact city only. Avoid stealing area queries into city zoom
  if (!best || bestScore < 80) return null

  return {
    lat: best.lat,
    lng: best.lng,
    label: best.city,
    source: 'city',
    zoom: 12,
    city: best.city,
  }
}

/** True when the query looks like an area/place (not a bare club name). */
export function looksLikePlaceQuery(query: string, cities: CityPlace[]): boolean {
  const q = query.trim()
  if (q.length < 2) return false
  if (matchCityPlace(q, cities)) return true
  if (q.includes(',')) return true
  if (
    /\b(near|area|road|nagar|puram|pura|pete|layout|colony|cross|street|extension|stage|block|sector)\b/i.test(
      q,
    )
  ) {
    return true
  }
  // "ghansoli mumbai": city word present but query is more than the city alone
  const tail = matchCityInQuery(q, cities)
  const tailCity = tail?.city ?? tail?.label
  if (tail && tailCity && normalizePlaceText(q) !== normalizePlaceText(tailCity)) {
    return true
  }
  return false
}

export type GeocodeClientResult =
  | { focus: PlaceFocus; error?: undefined }
  | { focus: null; error: string | null }

/**
 * Geocode via Netlify `/api/geocode` (Mapbox Temporary Geocoding).
 */
export async function geocodePlace(
  query: string,
  options?: { signal?: AbortSignal; cityBias?: string | null },
): Promise<GeocodeClientResult> {
  const raw = query.trim()
  if (raw.length < 2) return { focus: null, error: null }

  const params = new URLSearchParams({ q: raw })
  if (options?.cityBias) params.set('city', options.cityBias)

  let res: Response
  try {
    res = await fetch(`/api/geocode?${params.toString()}`, {
      signal: options?.signal,
      headers: { Accept: 'application/json' },
    })
  } catch {
    return { focus: null, error: 'Could not reach place search. Check your network.' }
  }

  const contentType =
    typeof res.headers?.get === 'function'
      ? (res.headers.get('content-type') ?? '')
      : ''
  // SPA fallbacks often return 200 HTML for missing /api/geocode.
  if (contentType && !contentType.includes('application/json')) {
    return {
      focus: null,
      error:
        'Place search is temporarily unavailable. Try a city or club name, or pan the map.',
    }
  }

  let data: {
    place?: {
      lat: number
      lng: number
      label: string
      zoom: number
      city?: string
    } | null
    error?: string
    reason?: string
  }
  try {
    data = (await res.json()) as typeof data
  } catch {
    return {
      focus: null,
      error:
        'Place search is temporarily unavailable. Try a city or club name, or pan the map.',
    }
  }

  if (res.status === 429 || data.reason === 'rate_limited') {
    return {
      focus: null,
      error: 'Too many place searches. Please wait a minute and try again.',
    }
  }

  if (
    res.status === 403 ||
    data.reason === 'forbidden' ||
    res.status === 503
  ) {
    return {
      focus: null,
      error:
        'Place search is temporarily unavailable. Try a city or club name, or pan the map.',
    }
  }

  if (!res.ok || !data.place) {
    return { focus: null, error: null }
  }

  return {
    focus: {
      lat: data.place.lat,
      lng: data.place.lng,
      label: data.place.label,
      source: 'place',
      zoom: data.place.zoom,
      city: data.place.city ?? options?.cityBias ?? undefined,
    },
  }
}

/**
 * Resolve a search string to a map focus.
 * Priority: city index → Mapbox geocode → city word fallback.
 */
export async function resolvePlaceSearch(
  query: string,
  cities: CityPlace[],
  options?: {
    signal?: AbortSignal
    cityContext?: string | null
    allowGeocode?: boolean
  },
): Promise<PlaceFocus | null> {
  const q = query.trim()
  if (q.length < 2) return null

  const city = matchCityPlace(q, cities)
  if (city) return city

  const cityFromTail = matchCityInQuery(q, cities)

  if (options?.allowGeocode !== false) {
    // Prefer city named in this query; do not reuse a sticky previous city alone.
    const cityBias = cityFromTail?.city ?? options?.cityContext ?? null
    const { focus, error } = await geocodePlace(q, {
      signal: options?.signal,
      cityBias,
    })
    if (focus) return focus
    if (error) {
      const err = new Error(error)
      err.name = 'GeocodeConfigError'
      throw err
    }
  }

  // Geocode miss (or skipped): still zoom to city if the query names one
  return cityFromTail
}

export function matchCityInQuery(
  query: string,
  cities: CityPlace[],
): PlaceFocus | null {
  const q = normalizePlaceText(query)
  for (const city of cities) {
    const name = normalizePlaceText(city.city)
    const aliased = CITY_ALIASES[name] ?? name
    if (
      q.endsWith(` ${name}`) ||
      q.endsWith(` ${aliased}`) ||
      q.includes(` ${aliased} `) ||
      q.endsWith(`, ${name}`) ||
      q.endsWith(`, ${aliased}`) ||
      q.includes(`, ${aliased}`) ||
      q.includes(`, ${name}`)
    ) {
      return {
        lat: city.lat,
        lng: city.lng,
        label: city.city,
        source: 'city',
        zoom: 12,
        city: city.city,
      }
    }
  }

  for (const [alias, target] of Object.entries(CITY_ALIASES)) {
    const aliasRe = new RegExp(`(?:^|\\s|,)${alias}(?:\\s|,|$)`)
    if (!aliasRe.test(q)) continue
    const city = cities.find(
      (c) =>
        (CITY_ALIASES[normalizePlaceText(c.city)] ?? normalizePlaceText(c.city)) ===
        target,
    )
    if (city) {
      return {
        lat: city.lat,
        lng: city.lng,
        label: city.city,
        source: 'city',
        zoom: 12,
        city: city.city,
      }
    }
  }
  return null
}

export function clubsNearPoint(
  clubs: Club[],
  point: GeoPoint,
  radiusKm: number,
): Array<Club & { distanceKm: number }> {
  return clubs
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => ({
      ...c,
      distanceKm: haversineKm(
        point.lat,
        point.lng,
        c.latitude as number,
        c.longitude as number,
      ),
    }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

/** Expand radius until we have enough clubs or hit the cap. */
export function clubsNearPointAdaptive(
  clubs: Club[],
  point: GeoPoint,
  opts?: { minResults?: number; startKm?: number; maxKm?: number },
) {
  const minResults = opts?.minResults ?? 12
  const startKm = opts?.startKm ?? 15
  const maxKm = opts?.maxKm ?? 80

  const mappedClubs = clubs
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => ({
      ...c,
      distanceKm: haversineKm(
        point.lat,
        point.lng,
        c.latitude as number,
        c.longitude as number,
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)

  let radius = startKm
  let results = mappedClubs.filter((c) => c.distanceKm <= radius)

  while (results.length < minResults && radius < maxKm) {
    radius = Math.min(maxKm, radius * 2)
    results = mappedClubs.filter((c) => c.distanceKm <= radius)
  }

  return { results, radiusKm: radius }
}
