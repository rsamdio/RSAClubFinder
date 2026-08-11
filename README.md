[![Netlify Status](https://api.netlify.com/api/v1/badges/32a10838-d2ad-441c-9c1d-e9dc63301ce1/deploy-status)](https://app.netlify.com/projects/rsaclubfinder/deploys)

# Club Finder

Public, map-based discovery of Rotaract clubs across South Asia.

**Club Finder by Rotaract South Asia MDIO (RSAMDIO)**  
**Production domain:** [clubs.rsamdio.org](https://clubs.rsamdio.org)

## Stack

- Vite + React + TypeScript
- Leaflet + marker clustering
- Fuse.js (client-side search)
- Static `clubs.json` dataset (built from CSV at build time)
- Netlify hosting (SPA + `/api/geocode` + prerendered club pages + hidden SEO docs)
- Free OSM/CARTO map tiles (Leaflet)
- **Mapbox** Temporary Geocoding only (area → lat/lng on Enter)

No login. No database. Club search, filters, Near Me, and map interactions run in the browser. Place/area search goes through Mapbox (via Netlify) on commit only. Map pan/zoom does not bill Mapbox.

### Public SEO naming

- Titles end with `| Rotaract South Asia MDIO`
- Product: **Club Finder** (not “RSAMDIO Club Finder” as the primary name)
- Crawl hubs (not linked from the finder UI): [/about/](https://clubs.rsamdio.org/about/), [/how-to-find/](https://clubs.rsamdio.org/how-to-find/), [/llms.txt](https://clubs.rsamdio.org/llms.txt)

## Local development

```bash
npm install
cp .env.example .env
# Add your Mapbox token to .env
npm run dev
```

Open http://localhost:5173/

Without `MAPBOX_ACCESS_TOKEN`, area geocode returns 503 (city/club search and the free map still work).

```bash
npm test
npm run build
```

For production-like functions locally: `npx netlify dev` (optional; Vite already proxies `/api/geocode` in `npm run dev`).

## Mapbox setup (geocode only)

Tiles are **free OSM/CARTO** — no Mapbox tile token.

1. Create a free account at [mapbox.com](https://account.mapbox.com/).
2. Create a public access token (`pk.…`) with **Geocoding** enabled.
3. **Do not turn on URL restrictions** for this token. Geocode calls are made from the server (Vite middleware / Netlify Function) without a browser Referer — restricted tokens return **403** and place search fails.
4. Set in `.env` / Netlify env: `MAPBOX_ACCESS_TOKEN=pk.…`
5. Restart `npm run dev` after changing `.env`.
6. Free tier: **100,000 temporary geocodes/month** — enough for Enter-only search.

Do **not** store geocode results in `clubs.json`. Pins are session-only.

Guards: query ≤ 120 chars; 30 requests/IP/minute; see [docs/ops-geocode-alerts.md](docs/ops-geocode-alerts.md).

## Data workflow (CSV)

The live app reads **only** `public/data/clubs.json`.

Canonical build input: **`data/clubs.csv`**. Netlify `npm run build` runs `data:from-csv` then Vite then club prerender.

| File | Role |
| --- | --- |
| `data/sample-clubs.csv` | **Master format reference** — copy this header shape when preparing real data |
| `data/dummy-clubs.csv` | Full dummy set for local testing |
| `data/clubs.csv` | Canonical Netlify input (replace with your master export) |

```bash
# validate + write public/data/clubs.json
npm run data:from-csv -- data/clubs.csv

# regenerate sample + dummy + seed data/clubs.csv
npm run data:dummy
```

### CSV columns (canonical)

Required: `club_id`, `club_name`, `club_type`, `district`, `zone`, `country`, `city`, `last_updated`

| Column | Notes |
| --- | --- |
| `club_name` | **Short name only** (e.g. `NIT Bengaluru`). Build prefixes `Rotaract Club of `. |
| `club_type` | `Community` or `University` (lowercase also accepted; JSON stores `community` / `university`) |
| `zone` | Digit only (`4`); JSON shows `Zone 4` |
| `public_email`, `website`, `instagram`, `facebook`, `linkedin`, `youtube` | Optional public contacts |
| `latitude`, `longitude` | Optional; clubs without coords still appear in search/list |

**Removed:** `club_slug`, `university_name`, `campus_type`. Routes use `/club/{club_id}`.

**Forbidden:** phone/mobile columns — never written to JSON.

Legacy `club_type=institution` is mapped to `university`.

## Deploy (Netlify)

1. Connect this repo (or `npx netlify deploy`).
2. Build command: `npm run build` (CSV → JSON → Vite → prerender)
3. Publish directory: `dist`
4. Set env: `MAPBOX_ACCESS_TOKEN`
5. Custom domain: `clubs.rsamdio.org`

`netlify.toml` includes security headers, SPA fallback, `/club/*` 404 for unknown ids, and `/api/geocode`.

## Features

- Interactive South Asia map with clustering (OSM/CARTO tiles); idle marker cap 300
- Search on **Enter / Search**: club name, city (from dataset), or area (Mapbox)
- Pan the map (zoomed in) to browse nearest clubs (~15)
- Filters: country, state, city, district, zone, club type (searchable selects; active clubs only, no status field)
- Shareable query URLs; club share links use `/club/{club_id}`
- Club detail: visible email, icon social links, Contact CTA
- Near Me (one-shot geolocation)
- Mobile-first bottom sheet UX
- Prerendered club pages + sitemap for SEO

## What “Sheets publish pipeline” means

Optional later admin workflow — **not required for soft launch**.

Right now: replace `data/clubs.csv` → push → Netlify build emits `clubs.json` and prerendered club pages.
