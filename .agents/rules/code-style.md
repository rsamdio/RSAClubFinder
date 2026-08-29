# Code Style & UI/UX Guidelines

## 1. Design Aesthetics & Branding
* **Brand Identity**: **Club Finder** by *Rotaract South Asia MDIO (RSAMDIO)*.
* **Primary Color**: RSAMDIO Cranberry (`#D41B69` / `var(--crimson)`). Never use teal or generic green/blue.
* **Typography**: Self-hosted **Open Sans** (body text) and **Sentinel** (headings) in `public/fonts/`.
* **Mobile-First UX**: Responsive bottom sheet (`BottomSheet.tsx`) with snappy spring animations and 3 distinct snap points (`peek`, `half`, `full`).

---

## 2. React 19 & TypeScript Best Practices
* **Controlled Isolation**: Keep search input state local (`SearchBar.tsx`) to avoid re-rendering heavy parent components on every keystroke.
* **Leaflet Bulk Updates**: Always use bulk marker cluster APIs (`cluster.addLayers()` and `cluster.removeLayers()`) in `MapView.tsx` to eliminate redraw flicker.
* **Lazy Loading**: `MapView` and Leaflet must be loaded dynamically with `React.lazy()` to maintain fast initial page load times.
* **Clean Cleanup**: Ensure all event listeners, observers, and timeouts are properly cleaned up in `useEffect` return functions.

---

## 3. SEO & Geo Metadata
* **Title Suffix**: All page titles must end with `| Rotaract South Asia MDIO`.
* **Canonical Routes**: Club routes use `/club/{club_id}` without trailing slashes.
* **Static SEO Hubs**: Static pages under `/about/` and `/how-to-find/` must remain static HTML files and not be redirected to the SPA bundle.
