---
name: prerender-seo
description: >-
  Use this skill when modifying prerender scripts, sitemap generation, structured JSON-LD data,
  OG metadata, or hidden SEO hubs (/about/, /how-to-find/, llms.txt).
---

# Prerender & SEO Skill

This skill explains how SEO metadata and static prerendered club pages are generated and tested.

## Static Prerendering

* **Script**: [`scripts/prerender-clubs.mjs`](file:///Users/zeospec/Dev/Code/RSAClubFinder/scripts/prerender-clubs.mjs)
* **Output**:
  - `dist/club/{club_id}/index.html` (for every club in `public/data/clubs.json`)
  - `dist/sitemap.xml` (club `<loc>` values use trailing slash `/club/{club_id}/`)
  - `dist/404.html`

Canonical, OG url, and JSON-LD club urls use `/club/{club_id}/` via `clubPageUrl` / `clubPath` in `shared/seoMeta.mjs`.

## SEO Metadata Rules

1. **Title Format**: `{Club name} · {City} | Club Finder | Rotaract South Asia MDIO`
2. **Homepage Title**: `Club Finder - Find Rotaract Clubs Across South Asia | Rotaract South Asia MDIO`
3. **Structured Data (club)**: JSON-LD `@graph` with `WebPage` (speakable + `dateModified`), `Organization`/`NGO` + geo, `BreadcrumbList`, plus shared `WebSite` / publisher org.
4. **AI crawl**: Keep `public/robots.txt` allowing major search and AI retrieval bots; point at Sitemap. Treat `llms.txt` as advisory only.
5. Checklist: [`docs/seo-geo-aeo-checklist.md`](file:///Users/zeospec/Dev/Code/RSAClubFinder/docs/seo-geo-aeo-checklist.md).

## Running Prerender & Testing SEO

```bash
# Run prerender script
node scripts/prerender-clubs.mjs

# Run SEO unit tests
npm test scripts/seo-meta.test.mjs
```
