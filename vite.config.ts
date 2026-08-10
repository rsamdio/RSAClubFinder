import { defineConfig, loadEnv, type Plugin } from 'vite'
import type { Connect } from 'vite'
import react from '@vitejs/plugin-react'
import {
  GEOCODE_Q_MAX,
  forwardGeocodeMapbox,
} from './shared/mapboxGeocode.ts'

/**
 * Hidden SEO docs live as static HTML under public/. Vite's SPA fallback would
 * otherwise serve the React app for /about and /how-to-find, and the router
 * would bounce crawlers (and local testing) to the finder.
 */
const SEO_STATIC_PATHS: Record<string, string> = {
  '/about': '/about/index.html',
  '/about/': '/about/index.html',
  '/how-to-find': '/how-to-find/index.html',
  '/how-to-find/': '/how-to-find/index.html',
}

function rewriteSeoStaticRequest(req: Connect.IncomingMessage) {
  if (!req.url) return
  const qIndex = req.url.indexOf('?')
  const pathname = qIndex === -1 ? req.url : req.url.slice(0, qIndex)
  const query = qIndex === -1 ? '' : req.url.slice(qIndex)
  const target = SEO_STATIC_PATHS[pathname]
  if (target) req.url = `${target}${query}`
}

function seoStaticPages(): Plugin {
  return {
    name: 'seo-static-pages',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewriteSeoStaticRequest(req)
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewriteSeoStaticRequest(req)
        next()
      })
    },
  }
}

/** Dev + preview `/api/geocode` so place search works without `netlify dev`. */
function geocodeDevApi(mode: string): Plugin {
  /** Simple in-memory rate limit for local (mirrors Netlify Blobs window). */
  const hitsByIp = new Map<string, number[]>()
  const RATE_LIMIT = 30
  const RATE_WINDOW_MS = 60_000

  function allow(ip: string): boolean {
    const now = Date.now()
    const hits = (hitsByIp.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
    if (hits.length >= RATE_LIMIT) {
      hitsByIp.set(ip, hits)
      return false
    }
    hits.push(now)
    hitsByIp.set(ip, hits)
    return true
  }

  function mountGeocode(
    middlewares: Connect.Server,
  ): void {
    middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/api/geocode')) {
        next()
        return
      }

      void (async () => {
        try {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }
          if (req.method !== 'GET') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          // Reload .env on every request so token edits apply without a full restart.
          const env = loadEnv(mode, process.cwd(), '')
          const token = env.MAPBOX_ACCESS_TOKEN?.trim()
          if (!token) {
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.end(
              JSON.stringify({
                error: 'MAPBOX_ACCESS_TOKEN is not set in .env',
              }),
            )
            return
          }

          const url = new URL(req.url!, 'http://localhost')
          const q = (url.searchParams.get('q') ?? '').trim()
          if (q.length < 2) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.end(JSON.stringify({ error: 'Query q is required' }))
            return
          }
          if (q.length > GEOCODE_Q_MAX) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.end(
              JSON.stringify({
                error: 'Query is too long',
                reason: 'too_long',
              }),
            )
            return
          }

          const ip =
            req.socket.remoteAddress ||
            req.headers['x-forwarded-for']?.toString() ||
            'local'
          if (!allow(ip)) {
            res.statusCode = 429
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.end(
              JSON.stringify({
                place: null,
                reason: 'rate_limited',
                error:
                  'Too many place searches. Please wait a minute and try again.',
              }),
            )
            return
          }

          const cityBias = url.searchParams.get('city')?.trim() || null
          const outcome = await forwardGeocodeMapbox(q, token, { cityBias })
          res.setHeader('Content-Type', 'application/json')
          if (outcome.ok) {
            res.statusCode = 200
            res.setHeader('Cache-Control', 'public, max-age=300')
            res.end(JSON.stringify({ place: outcome.place }))
            return
          }
          res.setHeader('Cache-Control', 'no-store')
          if (outcome.reason === 'forbidden') {
            res.statusCode = 403
            res.end(
              JSON.stringify({
                place: null,
                reason: outcome.reason,
                error:
                  'Place search is temporarily unavailable. Try a city or club name, or pan the map.',
              }),
            )
            return
          }
          res.statusCode = 200
          res.end(JSON.stringify({ place: null, reason: outcome.reason }))
        } catch (err) {
          console.error('[dev-geocode-api]', err)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify({ error: 'Geocode request failed' }))
        }
      })()
    })
  }

  return {
    name: 'dev-geocode-api',
    configureServer(server) {
      mountGeocode(server.middlewares)
    },
    configurePreviewServer(server) {
      // Production-like preview must not SPA-fallback /api/geocode to index.html.
      mountGeocode(server.middlewares)
    },
  }
}

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), seoStaticPages(), geocodeDevApi(mode)],
  }
})
