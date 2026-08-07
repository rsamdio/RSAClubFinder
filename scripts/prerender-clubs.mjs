/**
 * After Vite build: sitemap + prerendered /club/{club_id} HTML with OG tags,
 * plus a 404 page. Unknown club ids fall through to the Netlify 404 redirect.
 *
 * Run: node scripts/prerender-clubs.mjs
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SITE_ORIGIN,
  OG_SITE_NAME,
  NOT_FOUND_TITLE,
  NOT_FOUND_DESCRIPTION,
  clubPageTitle,
  clubPageDescription,
  clubPageUrl,
  clubJsonLd,
} from './lib/seo-meta.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const distDir = join(root, 'dist')
const clubsPath = join(root, 'public/data/clubs.json')

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function replaceMeta(html, { title, description, url, jsonLd, noindex = false }) {
  let out = html
  out = out.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(title)}</title>`,
  )
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  )
  out = out.replace(
    /<meta\s+property="og:site_name"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:site_name" content="${escapeHtml(OG_SITE_NAME)}" />`,
  )
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
  )
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
  )
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
  )
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
  )
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  )
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
  )

  if (noindex) {
    if (/name="robots"/i.test(out)) {
      out = out.replace(
        /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
        '<meta name="robots" content="noindex" />',
      )
    } else {
      out = out.replace(
        '</head>',
        '  <meta name="robots" content="noindex" />\n  </head>',
      )
    }
  }

  if (jsonLd) {
    const block = `  <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n  </script>\n`
    // Prefer inserting before </head>; leave homepage graph intact and append club entity.
    out = out.replace('</head>', `${block}</head>`)
  }

  return out
}

function injectClubMeta(html, club) {
  const title = clubPageTitle(club)
  const description = clubPageDescription(club)
  const url = clubPageUrl(club.club_id)
  return replaceMeta(html, {
    title,
    description,
    url,
    jsonLd: clubJsonLd(club),
  })
}

function build404(html) {
  return replaceMeta(html, {
    title: NOT_FOUND_TITLE,
    description: NOT_FOUND_DESCRIPTION,
    url: `${SITE_ORIGIN}/`,
    noindex: true,
  })
}

if (!existsSync(distDir)) {
  console.error('dist/ missing. Run vite build first.')
  process.exit(1)
}

const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf8')
const dataset = JSON.parse(readFileSync(clubsPath, 'utf8'))
const clubs = dataset.clubs ?? []

const sitemapUrls = [
  `  <url><loc>${SITE_ORIGIN}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
  `  <url><loc>${SITE_ORIGIN}/about/</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
  `  <url><loc>${SITE_ORIGIN}/how-to-find/</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
]

for (const club of clubs) {
  const id = club.club_id
  if (!id) continue
  const dir = join(distDir, 'club', id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), injectClubMeta(indexHtml, club), 'utf8')
  sitemapUrls.push(
    `  <url><loc>${SITE_ORIGIN}/club/${encodeURIComponent(id)}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
  )
}

const sitemapBody = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.join('\n')}\n</urlset>\n`

writeFileSync(join(distDir, 'sitemap.xml'), sitemapBody, 'utf8')
writeFileSync(join(distDir, '404.html'), build404(indexHtml), 'utf8')

console.log(
  `Prerendered ${clubs.length} club pages + sitemap.xml + 404.html → ${distDir}`,
)
