import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  HOME_TITLE,
  OG_IMAGE_URL,
  OG_SITE_NAME,
  TWITTER_HANDLE,
  TWITTER_URL,
  clubPageDescription,
  clubPageJsonLdGraph,
  clubPageTitle,
  clubPageUrl,
  hubTitle,
} from '../shared/seoMeta.mjs'

describe('seo-meta', () => {
  it('locks homepage and site name formulas', () => {
    expect(HOME_TITLE).toBe(
      'Club Finder - Find Rotaract Clubs Across South Asia | Rotaract South Asia MDIO',
    )
    expect(OG_SITE_NAME).toBe('Club Finder | Rotaract South Asia MDIO')
    expect(hubTitle('About Club Finder')).toBe(
      'About Club Finder | Club Finder | Rotaract South Asia MDIO',
    )
  })

  it('locks official Twitter / X handle and URL', () => {
    expect(TWITTER_HANDLE).toBe('@rsa_mdio')
    expect(TWITTER_URL).toBe('https://x.com/rsa_mdio')
  })

  it('builds club titles with city and org suffix', () => {
    expect(
      clubPageTitle({
        club_name: 'Rotaract Club of NIT Bengaluru',
        city: 'Bengaluru',
      }),
    ).toBe(
      'Rotaract Club of NIT Bengaluru · Bengaluru | Club Finder | Rotaract South Asia MDIO',
    )
  })

  it('builds club fallback descriptions without em dashes', () => {
    const desc = clubPageDescription({
      club_name: 'Rotaract Club of Colombo Central',
      city: 'Colombo',
      country: 'Sri Lanka',
      district: '3220',
      zone: 'Zone 7',
      description: null,
    })
    expect(desc).toContain('Colombo, Sri Lanka')
    expect(desc).toContain('Club Finder by Rotaract South Asia MDIO (RSAMDIO)')
    expect(desc).not.toContain('—')
  })

  it('uses slash-free club URLs', () => {
    expect(clubPageUrl('100001')).toBe(
      'https://clubs.rsamdio.org/club/100001',
    )
  })

  it('points OG image at webp asset', () => {
    expect(OG_IMAGE_URL).toBe('https://clubs.rsamdio.org/og-club-finder.webp')
  })

  it('includes Twitter URL in organization sameAs within club JSON-LD graph', () => {
    const graph = clubPageJsonLdGraph({
      club_id: '100001',
      club_name: 'Rotaract Club of NIT Bengaluru',
      city: 'Bengaluru',
    })
    const org = graph['@graph'].find(
      (item) => item['@id'] === 'https://rsamdio.org/#organization',
    )
    expect(org).toBeDefined()
    expect(org.sameAs).toContain('https://x.com/rsa_mdio')
  })

  it('ensures static HTML entrypoints contain twitter:site and twitter:creator', () => {
    const root = join(import.meta.dirname, '..')
    const files = [
      join(root, 'index.html'),
      join(root, 'public/about/index.html'),
      join(root, 'public/how-to-find/index.html'),
    ]
    for (const file of files) {
      const html = readFileSync(file, 'utf8')
      expect(html).toContain('<meta name="twitter:site" content="@rsa_mdio" />')
      expect(html).toContain('<meta name="twitter:creator" content="@rsa_mdio" />')
    }
  })
})
