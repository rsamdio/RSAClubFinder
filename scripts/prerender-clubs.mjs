/**
 * After Vite build: sitemap + prerendered /club/{club_id}/ HTML with OG tags,
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
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_ALT,
  NOT_FOUND_TITLE,
  NOT_FOUND_DESCRIPTION,
  clubPageTitle,
  clubPageDescription,
  clubPageUrl,
  clubPageJsonLdGraph,
  sitemapLastmod,
} from '../shared/seoMeta.mjs'

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

function replaceOrInsert(html, pattern, replacement, insertBefore = '</head>') {
  if (pattern.test(html)) return html.replace(pattern, replacement)
  return html.replace(insertBefore, `  ${replacement}\n${insertBefore}`)
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
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${escapeHtml(OG_IMAGE_URL)}" />`,
  )
  out = replaceOrInsert(
    out,
    /<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />`,
  )
  out = replaceOrInsert(
    out,
    /<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />`,
  )
  out = replaceOrInsert(
    out,
    /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:alt" content="${escapeHtml(OG_IMAGE_ALT)}" />`,
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
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${escapeHtml(OG_IMAGE_URL)}" />`,
  )
  out = replaceOrInsert(
    out,
    /<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image:alt" content="${escapeHtml(OG_IMAGE_ALT)}" />`,
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
    const block = `  <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n  </script>`
    // Replace homepage graph entirely so club pages are not dual-entity.
    if (/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i.test(out)) {
      out = out.replace(
        /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
        block,
      )
    } else {
      out = out.replace('</head>', `${block}\n  </head>`)
    }
  }

  return out
}

function clubStaticBody(club) {
  const title = escapeHtml(club.club_name)
  const place = escapeHtml(
    [club.city, club.state, club.country].filter(Boolean).join(', '),
  )
  const desc = escapeHtml(clubPageDescription(club))
  const bits = []
  if (club.district) bits.push(`District ${escapeHtml(String(club.district))}`)
  if (club.zone) bits.push(escapeHtml(String(club.zone)))
  if (club.club_type === 'university') bits.push('University Based')
  else if (club.club_type === 'community') bits.push('Community Based')
  const metaLine = bits.length ? `<p>${bits.join(' · ')}</p>` : ''

  const contacts = []
  if (club.public_email) {
    contacts.push(
      `<li>Email: <a href="mailto:${escapeHtml(club.public_email)}">${escapeHtml(club.public_email)}</a></li>`,
    )
  }
  if (club.website) {
    contacts.push(
      `<li>Website: <a href="${escapeHtml(club.website)}" rel="noopener noreferrer">${escapeHtml(club.website)}</a></li>`,
    )
  }
  for (const [label, href] of [
    ['Instagram', club.instagram],
    ['Facebook', club.facebook],
    ['LinkedIn', club.linkedin],
    ['YouTube', club.youtube],
  ]) {
    if (href) {
      contacts.push(
        `<li>${label}: <a href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(href)}</a></li>`,
      )
    }
  }
  const contactBlock =
    contacts.length > 0
      ? `<h2>Public contact</h2>\n<ul>\n${contacts.join('\n')}\n</ul>`
      : ''

  return `
    <noscript>
      <main class="seo-club">
        <p><a href="/">Club Finder</a> by Rotaract South Asia MDIO</p>
        <h1>${title}</h1>
        ${place ? `<p>${place}</p>` : ''}
        ${metaLine}
        <p>${desc}</p>
        ${contactBlock}
        <p><a href="/">Open Club Finder</a> to explore the map and search.</p>
      </main>
    </noscript>`
}

function injectClubMeta(html, club) {
  const title = clubPageTitle(club)
  const description = clubPageDescription(club)
  const url = clubPageUrl(club.club_id)
  let out = replaceMeta(html, {
    title,
    description,
    url,
    jsonLd: clubPageJsonLdGraph(club),
  })
  // Visible to non-JS agents; SPA root still mounts for browsers with JS.
  out = out.replace(
    /<div id="root"><\/div>/i,
    `<div id="root"></div>${clubStaticBody(club)}`,
  )
  return out
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
  const lastmod = sitemapLastmod(club)
  const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : ''
  sitemapUrls.push(
    `  <url><loc>${SITE_ORIGIN}/club/${encodeURIComponent(id)}/</loc>${lastmodTag}<changefreq>monthly</changefreq><priority>0.6</priority></url>`,
  )
}

const sitemapBody = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.join('\n')}\n</urlset>\n`

writeFileSync(join(distDir, 'sitemap.xml'), sitemapBody, 'utf8')
writeFileSync(join(distDir, '404.html'), build404(indexHtml), 'utf8')

console.log(
  `Prerendered ${clubs.length} club pages + sitemap.xml + 404.html → ${distDir}`,
)
