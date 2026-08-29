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
  - `dist/sitemap.xml`
  - `dist/404.html`

## SEO Metadata Rules

1. **Title Format**: `{Club name} · {City} | Club Finder | Rotaract South Asia MDIO`
2. **Homepage Title**: `Club Finder - Find Rotaract Clubs Across South Asia | Rotaract South Asia MDIO`
3. **Structured Data**: JSON-LD Schema graph including `Organization`, `Place`, and `WebSite`.

## Running Prerender & Testing SEO

```bash
# Run prerender script
node scripts/prerender-clubs.mjs

# Run SEO unit tests
npm test scripts/seo-meta.test.mjs
```
