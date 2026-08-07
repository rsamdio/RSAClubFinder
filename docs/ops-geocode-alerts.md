# Geocode ops alerts

Place search hits Mapbox through `GET /api/geocode` (Netlify Function).

## Soft limits (shipped)

| Guard | Value |
| --- | --- |
| Query length | max 120 characters |
| Rate limit | 30 requests / IP / rolling minute (Netlify Blobs `geocode-rate`) |
| Error cache | `Cache-Control: no-store` on 4xx/5xx and empty results |
| CORS | Same-origin / localhost / `*.netlify.app` only |

## What to watch

1. **Spike in 429s** in Netlify Function logs → abuse or a client bug looping geocode. Confirm Blobs store is healthy; fail-open means a Blobs outage removes the rate limit.
2. **403 from Mapbox** → token URL restrictions, missing token, or invalid `types` (never send `poi` with `bbox`/`country` on Geocoding v5).
3. **502 / network errors** → Mapbox outage or egress issues.
4. **Function duration / concurrent invocations** climbing with traffic → consider tightening the rate window or adding Netlify Analytics / Log Drains alerts.

## Suggested alerts

- Netlify → Notifications / Log Drains: alert on function error rate > 5% over 15 minutes for `geocode`.
- Optional: Log Drain → Datadog/Better Stack filter `status=429` count > 100 / 5 min.

## Local vs production

- `npm run dev` uses an in-memory rate limit (same 30/min) in Vite middleware.
- Production uses Blobs. If you see “environment has not been configured to use Netlify Blobs”, deploy with Functions + Blobs enabled (default on Netlify sites).
