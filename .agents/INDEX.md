# Club Finder Codebase Index & Architecture Map

> **Product**: Club Finder by Rotaract South Asia MDIO (RSAMDIO)  
> **Production Domain**: `https://clubs.rsamdio.org`  
> **Architecture**: Zero-database static SPA + Netlify serverless functions (`/api/geocode`) + build-time prerendered SEO pages.

This index provides a fast, token-optimized navigation map of all components, libraries, hooks, types, scripts, Netlify functions, and configurations across the repository.

---

## 1. High-Level Architecture & Request Flow

```
User Query (Browser)
  ├── Search Input (SearchBar) [Commit on Enter/Clear only]
  │     ├── 1. Exact City Match (lib/places.ts -> buildCityIndex from clubs.json)
  │     ├── 2. Mapbox Forward Geocode (shared/mapboxGeocode.ts via /api/geocode)
  │     └── 3. Club / City-word Fallback (lib/search.ts via Fuse.js)
  │
  ├── Near Me (useNearMe -> GPS one-shot -> clubsNearPointAdaptive -> standing me-dot)
  ├── Recenter Control (MapView -> Pan to standing me-dot without altering search session)
  ├── Map Pan Browse (MapView onMoveEnd -> nearest ~15 clubs to map center; keeps all map markers)
  └── Attribute Filters (FilterPanel -> Country, State, City, District, Zone, Club Type)

Data & Edge Architecture:
  data/clubs.csv ──(scripts/csv-to-clubs.mjs)──> public/data/clubs.json ──(Fetch)──> FinderApp (Browser)
  Build: tsc -b && vite build && scripts/prerender-clubs.mjs ──> dist/ (Static SPA + Prerendered HTML)
```

---

## 2. Core UI Components & App Shell (`src/` & `src/components/`)

* [`main.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/main.tsx): Client-side application entrypoint initializing `BrowserRouter` and mounting React root.
* [`App.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/App.tsx): Top-level routing wrapper mounting `FinderApp` and `AnalyticsRouteListener`.
* [`index.css`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/index.css): Comprehensive styling sheet with design tokens, responsive bottom sheet variables, desktop panel layout, and Leaflet cluster customizations.
* [`FinderApp.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/components/FinderApp.tsx): Root application controller and state orchestrator. Manages filter state, search epoch, committed query, place lookup, map view bounds, bottom sheet snap points, routing synchronization via `history.replaceState`, and Near Me sessions.
* [`MapView.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/components/MapView.tsx): Lazy-loaded Leaflet map with Survey of India boundary-corrected Esri World Street Map tiles (`@india-boundary-corrector/leaflet-layer`) and native marker clustering (`leaflet.markercluster`). Uses bulk layer operations (`addLayers`/`removeLayers`) to eliminate redraw flicker. Manages focus markers, standing GPS user marker, and camera ownership.
* [`SearchBar.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/components/SearchBar.tsx): Controlled search input that commits queries solely on `Enter` keypress or `Clear` action to prevent map/list thrashing during typing.
* [`SearchableSelect.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/components/SearchableSelect.tsx): Accessible, searchable dropdown select component for high-cardinality filters (Country, State, City, District, Zone).
* [`FilterPanel.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/components/FilterPanel.tsx): Multi-criteria filter drawer for cascading location filters, district, zone, and segmented control for club types (`all`, `community`, `university`).
* [`ClubList.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/components/ClubList.tsx): Progressively rendered batch list of filtered and ranked clubs displaying distance, city, district, zone badge, and charter year.
* [`ClubDetail.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/components/ClubDetail.tsx): Detailed profile view for a selected club, showing meeting location/times, public email, website, social links (Instagram, Facebook, LinkedIn, YouTube), and directions CTA.
* [`BottomSheet.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/components/BottomSheet.tsx): Mobile-first draggable bottom sheet supporting three snap states (`peek`, `half`, `full`).
* [`LocationPrompt.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/components/LocationPrompt.tsx): Welcome modal requesting one-time geolocation permission to initialize Near Me discovery.
* [`Toast.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/components/Toast.tsx): Lightweight notification banner for link-copied and status events.
* [`AnalyticsRouteListener.tsx`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/components/AnalyticsRouteListener.tsx): Route change listener for tracking pageviews across club deep-links and filters.

---

## 3. Libraries & Logic (`src/lib/` & `shared/`)

* [`src/lib/places.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/lib/places.ts): Place resolution engine. Builds client-side city centroids (`buildCityIndex`), performs instant city matching (`matchCityPlace`), identifies place-like queries (`looksLikePlaceQuery`), handles adaptive radius search (`clubsNearPointAdaptive`), and executes geocoding calls (`resolvePlaceSearch`).
* [`src/lib/search.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/lib/search.ts): Fuse.js index builder (`createClubIndex`), strong substring matching (`hasStrongClubMatch`), attribute filtering, and distance sorting (`filterClubs`).
* [`src/lib/mapTiles.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/lib/mapTiles.ts): Esri World Street Map tile configuration and South Asia geographic bounding constants (`SOUTH_ASIA_CENTER`, `SOUTH_ASIA_ZOOM`, `MAP_BROWSE_MIN_ZOOM`).
* [`src/lib/mapViewTypes.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/lib/mapViewTypes.ts): Type definitions for `MapViewState` and marker display caps (`IDLE_MAP_MARKER_CAP`).
* [`src/lib/haversine.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/lib/haversine.ts): Great-circle distance calculator (`haversineKm`) in kilometers.
* [`src/lib/clubId.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/lib/clubId.ts): Club ID normalizer and lookup helper (`findClubById`, `normalizeClubIdParam`).
* [`src/lib/urlState.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/lib/urlState.ts): Query string serializer and deserializer (`filtersFromSearchParams`, `searchParamsFromFilters`, `filtersEqual`).
* [`src/lib/seoMeta.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/lib/seoMeta.ts): Client-side SEO metadata re-exports and title builders.
* [`shared/mapboxGeocode.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/shared/mapboxGeocode.ts): Isomorphic forward geocoding client shared between Vite dev middleware and Netlify Functions. Handles abbreviations (e.g. KGF), bounding boxes, rate limiting, and 403 prevention (omits deprecated `poi` type).
* [`shared/seoMeta.mjs`](file:///Users/zeospec/Dev/Code/RSAClubFinder/shared/seoMeta.mjs): Shared SEO constants, OpenGraph metadata, JSON-LD Schema.org generators, and title formatting rules.

---

## 4. Custom React Hooks (`src/hooks/`)

* [`useClubs.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/hooks/useClubs.ts): Fetches `public/data/clubs.json` on app mount and initializes the Fuse.js search index.
* [`useNearMe.ts`](file:///RSAClubFinder/src/hooks/useNearMe.ts): One-shot browser Geolocation API wrapper (`requestLocation`) handling permissions, error states, and coordinates.
* [`useDebouncedValue.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/hooks/useDebouncedValue.ts): Generic debounced value hook for dampening high-frequency events.
* [`useMediaQuery.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/hooks/useMediaQuery.ts): Responsive breakpoint hook (`useIsDesktop` at `768px`).

---

## 5. Type Definitions (`src/types/`)

* [`club.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/src/types/club.ts): Core TypeScript interfaces: `Club`, `ClubWithDistance`, `ClubFilters`, `ClubType` (`community` | `university`).

---

## 6. Serverless Backend (`netlify/functions/`)

* [`geocode.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/netlify/functions/geocode.ts): Serverless Netlify Function mounted at `/api/geocode`. Reads `MAPBOX_ACCESS_TOKEN` via `Netlify.env.get()`, enforces IP rate limiting (30 requests/IP/min via Netlify Blobs), validates query length (`q <= 120`), and proxies requests to Mapbox Temporary Geocoding.

---

## 7. Build, Validation & Prerender Scripts (`scripts/`)

* [`scripts/csv-to-clubs.mjs`](file:///Users/zeospec/Dev/Code/RSAClubFinder/scripts/csv-to-clubs.mjs): Transforms CSV club exports (`data/clubs.csv`) into canonical `public/data/clubs.json` with display name prefixing (`Rotaract Club of `) and zone formatting (`Zone N`).
* [`scripts/lib/validate-clubs.mjs`](file:///Users/zeospec/Dev/Code/RSAClubFinder/scripts/lib/validate-clubs.mjs): Strict validator for CSV records. Checks required columns, valid coordinates, URL formats, email validity, and forbids phone/mobile columns.
* [`scripts/lib/csv.mjs`](file:///Users/zeospec/Dev/Code/RSAClubFinder/scripts/lib/csv.mjs): Fast CSV row parser handling quoted fields, commas, and multiline values.
* [`scripts/lib/seo-meta.mjs`](file:///Users/zeospec/Dev/Code/RSAClubFinder/scripts/lib/seo-meta.mjs): Helper re-exporting shared SEO metadata functions for scripts.
* [`scripts/generate-dummy-clubs.mjs`](file:///Users/zeospec/Dev/Code/RSAClubFinder/scripts/generate-dummy-clubs.mjs): Generates sample & dummy CSV datasets for local development and testing.
* [`scripts/prerender-clubs.mjs`](file:///Users/zeospec/Dev/Code/RSAClubFinder/scripts/prerender-clubs.mjs): Post-build static site generator. Emits static `/club/{club_id}/index.html` pages with full OG tags, JSON-LD Schema, `404.html`, and `sitemap.xml`.
* [`scripts/lint-em-dashes.mjs`](file:///Users/zeospec/Dev/Code/RSAClubFinder/scripts/lint-em-dashes.mjs): Scans codebase for Unicode em dashes (`\u2014`) and enforces standard punctuation (`--fix` supported).
* [`scripts/harness-verify.mjs`](file:///Users/zeospec/Dev/Code/RSAClubFinder/scripts/harness-verify.mjs): Master harness verification script. Validates zero em dashes, index synchronization without file drift, CSV data integrity, unit test suites, and production build.

---

## 8. Static Assets & SEO Hubs (`public/`)

* [`public/data/clubs.json`](file:///Users/zeospec/Dev/Code/RSAClubFinder/public/data/clubs.json): Runtime static JSON dataset of active Rotaract clubs.
* [`public/about/index.html`](file:///Users/zeospec/Dev/Code/RSAClubFinder/public/about/index.html): Static crawlable About page for search engines and answer bots.
* [`public/how-to-find/index.html`](file:///Users/zeospec/Dev/Code/RSAClubFinder/public/how-to-find/index.html): Static crawlable How-To Guide for finding Rotaract clubs.
* [`public/llms.txt`](file:///Users/zeospec/Dev/Code/RSAClubFinder/public/llms.txt): LLM discovery manifest with canonical routes and metadata.
* [`public/sitemap.xml`](file:///Users/zeospec/Dev/Code/RSAClubFinder/public/sitemap.xml): Search engine sitemap generated at build time.
* [`public/fonts/`](file:///Users/zeospec/Dev/Code/RSAClubFinder/public/fonts): Self-hosted Open Sans & Sentinel fonts (woff2 + TTF).
* [`public/brand/`](file:///Users/zeospec/Dev/Code/RSAClubFinder/public/brand): RSAMDIO official brand logos and WebP assets.

---

## 9. Configuration Files

* [`package.json`](file:///Users/zeospec/Dev/Code/RSAClubFinder/package.json): Project dependencies, scripts (`dev`, `build`, `lint`, `test`, `verify`, `data:from-csv`, `data:dummy`, `lint:em-dashes`).
* [`vite.config.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/vite.config.ts): Vite build config, dev server middleware for `/api/geocode`, and rewrite rules for static SEO paths (`/about/`, `/how-to-find/`).
* [`netlify.toml`](file:///Users/zeospec/Dev/Code/RSAClubFinder/netlify.toml): Netlify build settings, static redirects, 404 handler for unknown `/club/*` routes, caching headers, and CSP embed rules.
* [`vitest.config.ts`](file:///Users/zeospec/Dev/Code/RSAClubFinder/vitest.config.ts): Vitest unit test configuration.
* [`.oxlintrc.json`](file:///Users/zeospec/Dev/Code/RSAClubFinder/.oxlintrc.json): Oxlint linter rule configuration.
* [`tsconfig.json`](file:///Users/zeospec/Dev/Code/RSAClubFinder/tsconfig.json): TypeScript base configuration with app and node references.

---

## 10. Key Architecture & Invariant Rules

1. **Commit on Enter/Clear Only**: Search inputs never debounce-query while typing. Search commits solely on Enter or Clear to prevent map and list jitter.
2. **Camera Ownership**: List updates (filtering, browsing nearby) must NEVER alter map center or zoom. Map auto-fit is restricted to intentional club-name searches.
3. **One-Shot Near Me**: GPS location triggers a single fly-to and sets a persistent session marker (standing me-dot). Recenter pans to this point without resetting search state.
4. **Zero-Database Runtime**: The application runs entirely on static JSON and serverless geocode proxying. No coordinates are written back to `clubs.json`.
5. **Survey of India Boundary Compliance**: Esri World Street Map tiles layered with `@india-boundary-corrector/leaflet-layer` to respect Indian sovereign border representation.
6. **No Phone Numbers**: Public dataset rejects any phone/mobile column during CSV validation.
7. **No Em Dashes**: Unicode em dashes (`\u2014`) are strictly forbidden across code, comments, CSS headers, data descriptions, and docs. Use periods, commas, colons, hyphens, or parentheses.
8. **Continuous Index Synchronization**: Any file creation, rename, relocation, or deletion must immediately update `.agents/INDEX.md` and root `INDEX.md`.
