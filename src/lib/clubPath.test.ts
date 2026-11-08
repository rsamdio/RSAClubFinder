import { describe, expect, it } from 'vitest'
import { matchPath } from 'react-router'
import { clubPath, clubPageUrl } from './seoMeta'

describe('clubPath / clubPageUrl', () => {
  it('always ends with a single trailing slash', () => {
    expect(clubPath('218548')).toBe('/club/218548/')
    expect(clubPath('RCLegacy')).toBe('/club/RCLegacy/')
    expect(clubPageUrl('218548')).toBe(
      'https://clubs.rsamdio.org/club/218548/',
    )
  })

  it('encodes special characters once', () => {
    expect(clubPath('a b')).toBe('/club/a%20b/')
  })
})

describe('React Router club route matching', () => {
  it('matches slashless and trailing-slash club paths', () => {
    const pattern = { path: '/club/:clubId', end: true }
    const bare = matchPath(pattern, '/club/218548')
    const slash = matchPath(pattern, '/club/218548/')
    expect(bare?.params.clubId).toBe('218548')
    expect(slash?.params.clubId).toBe('218548')
  })
})
