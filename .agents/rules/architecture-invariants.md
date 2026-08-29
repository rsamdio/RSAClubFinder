# Architectural Invariants & Security Boundaries

When developing, refactoring, or extending RSAClubFinder, strictly adhere to these invariants:

---

## 1. Zero-Database Edge Architecture
* **Public Static Dataset**: The finder runtime fetches exclusively `public/data/clubs.json`, which is built from `data/clubs.csv` at build time.
* **No Database Dependency**: Do not introduce a database (Firebase, Supabase, Postgres) for runtime club queries. Keep the architecture static, ultra-fast, and cost-free ($0/month).
* **No Storage of Geocode Coordinates**: Coordinates returned from Mapbox forward geocoding are strictly temporary and session-only. Never write them back into `clubs.json` or `clubs.csv`.

---

## 2. Geocoding & Rate Limiting Guardrails
* **Commit-Only Geocoding**: Never trigger place search / geocoding on keystroke or debounced input. Geocode requests are only triggered on explicit user `Enter` or `Search` click.
* **Rate Limits**: Netlify Function `/api/geocode` enforces a strict rate limit of 30 requests/IP/minute via Netlify Blobs.
* **Mapbox v5 Compatibility**:
  - Do NOT include `poi` in the `types` query parameter. POI was removed in Mapbox v5 and returns HTTP 403 when combined with `bbox`/`country`.
  - Token must NOT have URL restrictions (calls originate from backend server/proxy without browser Referer).
* **Query Length**: Max query length is capped at 120 characters (`GEOCODE_Q_MAX`).

---

## 3. Map & Camera Ownership Invariants
* **Camera Autonomy**: Updates to the filtered list or browse-nearby list must NEVER steal camera control (pan or zoom).
* **Auto-Fit Restriction**: Fitting map bounds to markers is permitted ONLY for intentional club-name searches (`hasStrongClubMatch`).
* **One-Shot Near Me**: Geolocation triggers a single fly-to and leaves a standing session marker (`myLocation`). Recenter pans to this marker without resetting search queries.
* **Survey of India Compliance**: Esri World Street Map tiles must always be wrapped with `@india-boundary-corrector/leaflet-layer` (`extendLeaflet(L)`).

---

## 4. Privacy & Data Safety
* **Forbidden Phone Columns**: Phone and mobile numbers are strictly forbidden in public datasets. `scripts/lib/validate-clubs.mjs` must fail if any phone/mobile column is present in the CSV.
* **Allowed Contact Channels**: `public_email`, `website`, `instagram`, `facebook`, `linkedin`, `youtube`.
