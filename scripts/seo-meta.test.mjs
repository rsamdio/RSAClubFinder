import { describe, expect, it } from 'vitest'
import {
  HOME_TITLE,
  OG_SITE_NAME,
  clubPageDescription,
  clubPageTitle,
  hubTitle,
} from './lib/seo-meta.mjs'

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
})
