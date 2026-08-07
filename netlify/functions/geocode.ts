import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import {
  GEOCODE_Q_MAX,
  forwardGeocodeMapbox,
} from '../../shared/mapboxGeocode'

const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')
  const host = req.headers.get('Host')
  const allowed =
    origin &&
    host &&
    (origin === `https://${host}` ||
      origin === `http://${host}` ||
      origin.endsWith('.netlify.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1'))
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function json(
  req: Request,
  body: unknown,
  status = 200,
  cacheControl = 'public, max-age=300',
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
      ...corsHeaders(req),
    },
  })
}

function clientIp(req: Request, context: Context): string {
  const xf = req.headers.get('x-nf-client-connection-ip')
  if (xf) return xf.trim()
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  const ctxIp = (context as { ip?: string }).ip
  return ctxIp || 'unknown'
}

async function allowRequest(ip: string): Promise<boolean> {
  try {
    const store = getStore({ name: 'geocode-rate', consistency: 'strong' })
    const key = `ip:${ip}`
    const now = Date.now()
    const existing = (await store.get(key, { type: 'json' })) as {
      hits?: number[]
    } | null
    const hits = (existing?.hits ?? []).filter((t) => now - t < RATE_WINDOW_MS)
    if (hits.length >= RATE_LIMIT) {
      await store.setJSON(key, { hits })
      return false
    }
    hits.push(now)
    await store.setJSON(key, { hits })
    return true
  } catch (err) {
    // Blobs unavailable (misconfig): fail open so place search still works.
    console.warn('geocode rate limit store unavailable', err)
    return true
  }
}

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req),
    })
  }

  if (req.method !== 'GET') {
    return json(req, { error: 'Method not allowed' }, 405, 'no-store')
  }

  const token = Netlify.env.get('MAPBOX_ACCESS_TOKEN')
  if (!token) {
    return json(
      req,
      { error: 'Place search is temporarily unavailable.' },
      503,
      'no-store',
    )
  }

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return json(req, { error: 'Query q is required' }, 400, 'no-store')
  }
  if (q.length > GEOCODE_Q_MAX) {
    return json(
      req,
      { error: 'Query is too long', reason: 'too_long' },
      400,
      'no-store',
    )
  }

  const ip = clientIp(req, context)
  if (!(await allowRequest(ip))) {
    return json(
      req,
      {
        place: null,
        error: 'Too many place searches. Please wait a minute and try again.',
        reason: 'rate_limited',
      },
      429,
      'no-store',
    )
  }

  const cityBias = url.searchParams.get('city')?.trim() || null

  try {
    const outcome = await forwardGeocodeMapbox(q, token, { cityBias })
    if (outcome.ok) {
      return json(req, { place: outcome.place })
    }
    if (outcome.reason === 'forbidden') {
      return json(
        req,
        {
          place: null,
          error:
            'Place search is temporarily unavailable. Try a city or club name, or pan the map.',
          reason: outcome.reason,
        },
        403,
        'no-store',
      )
    }
    if (outcome.reason === 'too_long') {
      return json(
        req,
        { place: null, error: 'Query is too long', reason: 'too_long' },
        400,
        'no-store',
      )
    }
    return json(req, { place: null, reason: outcome.reason }, 200, 'no-store')
  } catch (err) {
    console.error('geocode failed', err)
    return json(req, { error: 'Geocode request failed' }, 502, 'no-store')
  }
}

export const config: Config = {
  path: '/api/geocode',
  method: ['GET', 'OPTIONS'],
}
