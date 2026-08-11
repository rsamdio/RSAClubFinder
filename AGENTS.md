# AGENTS.md — Club Finder (Rotaract South Asia MDIO)

Persistent context for AI agents and humans working on this repo. Prefer this file over reconstructed chat history.

## What this project is

Standalone **public Club Finder** for Rotaract clubs across South Asia, by **Rotaract South Asia MDIO (RSAMDIO)**. Not part of the main MDA marketing site.

| Item | Value |
| --- | --- |
| Production domain | https://clubs.rsamdio.org |
| Product name | Club Finder |
| Affiliation | Club Finder by Rotaract South Asia MDIO (RSAMDIO) |
| GitHub | https://github.com/rsamdio/RSAClubFinder.git |
| Hosting | Netlify (SPA + Functions) |
| Stack | Vite + React 19 + TypeScript, Leaflet + markercluster (lazy-loaded), Fuse.js |
| Data | Static `public/data/clubs.json` built from `data/clubs.csv` |
| Map tiles | Free OSM/CARTO (Leaflet) — no Mapbox tile billing |
| Place search | Mapbox Temporary Geocoding via Netlify `/api/geocode` only |
| Fonts | Self-hosted Open Sans + Sentinel (`public/fonts`, woff2 + TTF fallback) |

No login. No app database. Clubs live in static JSON; Mapbox only supplies a session map pin for area search.

### SEO / GEO naming (do not regress)

- Title suffix always ends with `| Rotaract South Asia MDIO`
- Homepage title: `Club Finder - Find Rotaract Clubs Across South Asia | Rotaract South Asia MDIO`
- Club title: `{Club name} · {City} | Club Finder | Rotaract South Asia MDIO`
- Club canonical / sitemap: `/club/{club_id}` (no trailing slash; matches SPA routes)
- `og:site_name`: `Club Finder | Rotaract South Asia MDIO`
- OG image: `/og-club-finder.webp` (1200×630)
- Prefer product phrasing **Club Finder** / **Club Finder by Rotaract South Asia MDIO (RSAMDIO)**. Do not use “RSAMDIO Club Finder” as the primary product title (legacy alternateName in schema only).
- Hidden crawl pages (no finder UI links): `/about/`, `/how-to-find/`, plus `llms.txt`. Meta helpers: `shared/seoMeta.mjs`.
- Helpers and prerender: `scripts/prerender-clubs.mjs`

## Commands

```bash
npm install
cp .env.example .env   # add Mapbox tokens
npm run dev            # Vite; also serves /api/geocode in dev
npm test
npm run build          # CSV → JSON → vite → prerender club pages
npm run lint
npm run data:dummy     # regenerates sample + dummy + seeds data/clubs.csv
npm run data:from-csv -- data/clubs.csv
```

Optional: `npx netlify dev` for production-like functions. Local Vite (`npm run dev` and `npm run preview`) serves `/api/geocode` when `MAPBOX_ACCESS_TOKEN` is set.

## Architecture (settled)

```
Browser (FinderApp)
  ├─ Club / city search     ← Fuse + city index from clubs.json (no network)
  ├─ Area search (Enter / Search) ← GET /api/geocode → Mapbox → lat/lng pin
  ├─ Near me (one-shot)     ← browser GPS → fly once → nearby list (not a sticky mode); standing me-dot stays after pan
  ├─ Recenter (map control) ← pan to known me only; no search bubble / list change
  ├─ Map pan browse         ← nearest clubs to map center (zoom ≥ 10); list-only (map keeps idle markers); never steals camera
  └─ Filters / share URLs   ← client-side; history.replaceState for query

Cold load: MapView/Leaflet is React.lazy; clubs.json is preloaded from index.html; fonts are woff2.
Do not regress Enter-only search or camera ownership when changing the load path.

Netlify
  ├─ Static dist/ SPA + prerendered /club/{club_id}/index.html
  ├─ Hidden docs: /about/, /how-to-find/ (static HTML; sitemap + llms.txt only; not linked from finder UI; must not SPA-rewrite)
  ├─ Unknown /club/* → 404.html (HTTP 404)
  └─ netlify/functions/geocode.ts  path: /api/geocode (q≤120, 30/IP/min via Blobs)
```

### Search behaviour (do not regress)

1. **Commit search only on Enter or Clear** (never debounce-while-typing; causes map/list thrash).
2. Resolve order: **exact city (from clubs)** → **Mapbox geocode** → **city-word fallback** in the query.
3. Skip geocode only for a **strong** club-name substring match (not Fuse near-misses; `kolar` must not become Kolkata clubs).
4. Do **not** stick previous city context onto bare place queries (Ghansoli→Mumbai must not bias later `Kolar`).
5. Tiny expansions only (e.g. `KGF` → Kolar Gold Fields); no localities gazetteer.
6. Keep a tiny `CITY_ALIASES` map only (e.g. Bangalore → Bengaluru).
7. Mapbox results are **temporary / session-only** (never write geocode coords into `clubs.json`).
8. **Tiles are always free OSM/CARTO** (Leaflet). Mapbox is geocode-only.
9. Brand UI: RSAMDIO cranberry `#D41B69` (not teal). Logo in header (`/brand/rsamdio.webp`); fonts match rsamdio.org: **Open Sans** + **Sentinel** (self-hosted woff2 + TTF in `public/fonts`).
10. User-facing copy: no Mapbox / token / stack jargon; speak only in visitor terms (search, map, near you).
11. No em dashes (—) in user-facing copy. Use periods, commas, or parentheses.
12. **Camera ownership:** never move zoom/center because the browse/nearby *list* updated. Auto-fit markers only for intentional club-name search. Place/locate/club-select may fly once (club fly may keep the place pin).
13. **Near Me is one-shot** (Maps-style locate): GPS → fly once → show nearby. Not a sticky “On” mode, not in the URL, must not block later search/pan. After a successful locate, keep a quiet standing **me** marker for the tab session (survives pan/zoom/place search). **Recenter** (bottom-right map control) only pans to that me point; it must not create a Near Me search session or change the club list.
14. **Open club keeps nearby markers:** selecting a club must not replace place/Near Me nearby pins with the idle A–Z marker cap. Deep-link `/club/{id}` shows ~15 neighbors around that club. Map pan browse is **list-only**: the list shows ~15 nearest while the map keeps the idle marker set (cap 300). `trackView` stays off while a club is open (frozen browse center; no list thrash).

### Club types (RI)

- CSV may use **`Community`** | **`University`** (title case from data exports). Import normalizes to lowercase `community` | `university` in JSON.
- No `university_name` / `campus_type` in CSV or app.
- CSV import still maps legacy `club_type=institution` → `university`.

### Club naming & routes

- CSV `club_name` is **short** (e.g. `NIT Bengaluru`). Build prefixes **`Rotaract Club of `** into JSON (skip if already prefixed).
- Routes use **`/club/{club_id}`** (official RI id). No `club_slug`.
- CSV `zone` is a **digit**; JSON/UI show **`Zone N`**.

### Contacts (public JSON)

- Allowed: `public_email`, `website`, `instagram`, `facebook`, `linkedin`, `youtube`.
- **Forbidden:** any phone/mobile column (validator rejects).

### Filters (keep)

Country, state, city, **district**, zone, **club type**. No status field or filter (dataset is active clubs only). Near Me is an action button (not a shareable filter). Filters shareable via query string (`src/lib/urlState.ts`). Long lists use searchable selects; club type uses a segmented control.

### Scale

~450 dummy clubs now; expect ~5k. Stay on static JSON + client Fuse + markercluster. Idle map marker hard-cap **300**. Browse/place nearest lists **~15**. No self-hosted place DB.

## Data workflow

| Path | Role |
| --- | --- |
| `data/sample-clubs.csv` | **Master format reference** (headers + examples) |
| `data/dummy-clubs.csv` | Full dummy set for local map/search testing |
| `data/clubs.csv` | **Canonical Netlify build input** (replace with master export) |
| `npm run data:from-csv` | Validate → `public/data/clubs.json` (also runs inside `npm run build`) |
| `public/data/clubs.json` | **Only** runtime club dataset the app fetches |

Accurate lat/lng in the CSV matters more than neighbourhood search quality.

Google Sheets publish pipeline is **out of V1** (optional later admin workflow).

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `MAPBOX_ACCESS_TOKEN` | Netlify + local `.env` | Server geocode (`/api/geocode`) only |

Never commit `.env`. Template: `.env.example`. No `VITE_MAPBOX_*` tile token — basemap is free OSM/CARTO.

**Geocode guards:** q ≤ 120; 30 requests/IP/minute (Blobs); errors `Cache-Control: no-store`. Ops notes: `docs/ops-geocode-alerts.md`.

**Geocode 403 gotchas:** (1) do not pass `poi` in Mapbox v5 `types` together with `bbox`/`country` — POI was removed from v5 and Mapbox returns 403; (2) URL-restricted tokens also 403 on server calls (no Referer). If place search fails with 403, check query params first, then the token.

In Netlify Functions use `Netlify.env.get(...)`, not `process.env`.

## Key files

| Concern | Location |
| --- | --- |
| App shell / orchestration | `src/components/FinderApp.tsx` |
| Search input (Enter / Clear) | `src/components/SearchBar.tsx` |
| Leaflet map + clusters | `src/components/MapView.tsx` |
| Filters UI | `src/components/FilterPanel.tsx` |
| Club detail (icons + email) | `src/components/ClubDetail.tsx` |
| Place / city / geocode client | `src/lib/places.ts` |
| Fuse + attribute filters | `src/lib/search.ts` |
| Map tiles | `src/lib/mapTiles.ts` |
| URL filter state | `src/lib/urlState.ts` |
| Shared Mapbox forward geocode | `shared/mapboxGeocode.ts` |
| Geocode function | `netlify/functions/geocode.ts` |
| Club types | `src/types/club.ts` |
| CSV → JSON | `scripts/csv-to-clubs.mjs`, `scripts/lib/validate-clubs.mjs` |
| Prerender / sitemap | `scripts/prerender-clubs.mjs`, `shared/seoMeta.mjs` |
| Hidden SEO pages | `public/about/`, `public/how-to-find/`, `public/llms.txt` |
| Netlify config | `netlify.toml` |

## Product boundaries (out of V1)

Claim club, join forms, verified badges, rich profiles, district microsites, required analytics, Google Sheets runtime dependency, Firebase for this app. Phones in public data. Campus filters. Human-readable slugs.

## Git

- Remote: `origin` → `https://github.com/rsamdio/RSAClubFinder.git`
- Default branch: `main`
- Do **not** commit or push unless the user explicitly asks
- Ignore: `node_modules`, `dist`, `.env`, `.netlify`

## Agent habits

- Prefer editing existing finder components over new frameworks or a second host (stay on Netlify).
- After search/map changes: run `npm test` and `npm run build`.
- When behaviour around place search changes, update this file’s “Search behaviour” section in the same PR/change set.
