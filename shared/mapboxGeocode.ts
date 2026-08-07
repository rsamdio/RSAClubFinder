/**
 * Shared Mapbox Temporary Geocoding helper (Netlify function + Vite dev middleware).
 * Results are for session map focus only — do not persist into the club dataset.
 *
 * Do not pass `poi` in `types` — POI was removed from Geocoding v5; combining
 * `poi` with `bbox`/`country` returns HTTP 403 Forbidden.
 *
 * Prefer a token without URL restrictions (server geocode has no browser Referer).
 */

export interface MapboxGeocodeResult {
  lat: number
  lng: number
  label: string
  zoom: number
  city?: string
}

export type GeocodeFailureReason =
  | 'empty'
  | 'forbidden'
  | 'http'
  | 'network'
  | 'no_token'
  | 'too_long'

export type GeocodeOutcome =
  | { ok: true; place: MapboxGeocodeResult }
  | { ok: false; reason: GeocodeFailureReason; status?: number }

export const GEOCODE_Q_MAX = 120

/** South Asia-ish bbox: minLon,minLat,maxLon,maxLat */
const SOUTH_ASIA_BBOX = '60,1,98,38'

/** Tiny abbreviation expansions — not a locality gazetteer. */
const QUERY_EXPAND: Record<string, string> = {
  kgf: 'Kolar Gold Fields, Karnataka, India',
  'k g f': 'Kolar Gold Fields, Karnataka, India',
  kolar: 'Kolar, Karnataka, India',
}

const PLACE_TYPES = [
  'neighborhood',
  'locality',
  'place',
  'district',
  'region',
  'address',
].join(',')

/** Exported for tests — keep the map tiny. */
export function expandGeocodeQuery(raw: string): string {
  const key = raw.toLowerCase().replace(/\s+/g, ' ').trim()
  return QUERY_EXPAND[key] ?? raw
}

/**
 * Only append city bias for neighbourhood-style queries.
 * Never stick a previous city (e.g. Mumbai) onto a new place like "Kolar".
 */
export function shouldBiasGeocodeToCity(query: string): boolean {
  const q = query.trim()
  if (!q || q.includes(',')) return false
  return /(nagar|puram|pura|pete|layout|colony|road|street|cross|extension|stage|block|sector|area|near)\b/i.test(
    q,
  )
}

export async function forwardGeocodeMapbox(
  query: string,
  token: string,
  options?: { cityBias?: string | null; signal?: AbortSignal },
): Promise<GeocodeOutcome> {
  const raw = query.trim()
  if (!token) return { ok: false, reason: 'no_token' }
  if (raw.length < 2) return { ok: false, reason: 'empty' }
  if (raw.length > GEOCODE_Q_MAX) return { ok: false, reason: 'too_long' }

  const expanded = expandGeocodeQuery(raw)
  const bias = options?.cityBias?.trim()
  const useBias =
    Boolean(bias) &&
    shouldBiasGeocodeToCity(raw) &&
    !expanded.toLowerCase().includes(bias!.toLowerCase())
  const q = useBias ? `${expanded}, ${bias}` : expanded

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
  )
  url.searchParams.set('access_token', token)
  url.searchParams.set('limit', '3')
  url.searchParams.set('types', PLACE_TYPES)
  url.searchParams.set('bbox', SOUTH_ASIA_BBOX)
  url.searchParams.set('country', 'in,lk,np,bd,pk,mv,bt')
  url.searchParams.set('language', 'en')

  let res: Response
  try {
    res = await fetch(url.toString(), {
      signal: options?.signal,
      headers: { Accept: 'application/json' },
    })
  } catch {
    return { ok: false, reason: 'network' }
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: 'forbidden', status: res.status }
  }
  if (!res.ok) {
    return { ok: false, reason: 'http', status: res.status }
  }

  const data = (await res.json()) as {
    features?: Array<{
      center?: [number, number]
      place_name?: string
      text?: string
      place_type?: string[]
      context?: Array<{ id: string; text: string }>
    }>
  }

  const hit = data.features?.[0]
  if (!hit?.center) return { ok: false, reason: 'empty' }

  const [lng, lat] = hit.center
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, reason: 'empty' }
  }

  const types = hit.place_type ?? []
  const isNeighbourhood =
    types.includes('neighborhood') ||
    types.includes('locality') ||
    types.includes('address')

  const cityFromContext =
    hit.context?.find((c) => c.id.startsWith('place.'))?.text ??
    (types.includes('place') ? hit.text : undefined)

  return {
    ok: true,
    place: {
      lat,
      lng,
      label:
        hit.place_name?.split(',').slice(0, 3).join(',').trim() ||
        hit.text ||
        raw,
      zoom: isNeighbourhood ? 13 : types.includes('place') ? 12 : 11,
      city: cityFromContext ?? (useBias ? bias : undefined) ?? undefined,
    },
  }
}
