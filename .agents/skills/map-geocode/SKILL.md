---
name: map-geocode
description: >-
  Use this skill when configuring, debugging, or extending map features, Esri tiles,
  Survey of India boundary corrections, or Mapbox forward geocoding endpoints.
---

# Map & Geocoding Skill

This skill provides operational and debugging guidance for map tiles and geocoding.

## Architecture

* **Tiles**: Esri World Street Map (default), Light Gray, Dark via `@india-boundary-corrector/leaflet-layer` (`extendLeaflet(L)`).
* **Layer configs**: Register Esri-tuned configs in `src/lib/indiaBoundaryLayerConfigs.ts` before creating layers. Do not reuse `osm-carto` / `cartodb-*` paint profiles on Esri URLs.
* **PMTiles**: Self-hosted `/data/india_boundary_corrections.pmtiles`. Never full-file preload it (breaks Range requests). Keep Vite `Accept-Ranges` + `Cache-Control: no-cache` middleware for local range reads. After upgrading `@india-boundary-corrector/*`, re-copy the package PMTiles into `public/data/` if the blob changed.
* **QA hotspots**: `docs/india-boundary-qa.md` (J&K, Arunachal, Sir Creek; zooms 5–14).
* **Geocoding**: Mapbox Temporary Geocoding via `/api/geocode`.
* **Dev API Proxy**: In `npm run dev` and `npm run preview`, `vite.config.ts` mounts a dev middleware that proxies `/api/geocode` with local rate limiting.

## Debugging Geocoding (HTTP 403 Gotchas)

1. **Do not use `poi`**: Mapbox v5 removed `poi`. Combining `poi` with `bbox` or `country` causes HTTP 403.
2. **URL Restrictions**: Ensure the token does NOT have URL restrictions enabled in the Mapbox console because requests originate from the backend/middleware without a browser Referer header.

## Running Map & Geocode Unit Tests

```bash
npm test src/lib/places.test.ts src/lib/mapboxGeocode.test.ts src/lib/haversine.test.ts
```
