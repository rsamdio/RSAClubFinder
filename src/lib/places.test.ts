import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Club } from '../types/club'
import {
  buildCityIndex,
  geocodePlace,
  matchCityInQuery,
  matchCityPlace,
  resolvePlaceSearch,
} from './places'

function club(partial: Partial<Club> & Pick<Club, 'club_id' | 'club_name' | 'city' | 'latitude' | 'longitude'>): Club {
  return {
    club_type: 'community',
    district: '3192',
    zone: 'Zone 4',
    country: 'India',
    state: 'Karnataka',
    charter_date: null,
    meeting_location: null,
    meeting_day: null,
    meeting_time: null,
    public_email: null,
    website: null,
    instagram: null,
    facebook: null,
    linkedin: null,
    youtube: null,
    description: null,
    last_updated: '2026-08-01',
    ...partial,
  }
}

const clubs: Club[] = [
  club({
    club_id: '1',
    club_name: 'A',
    city: 'Bengaluru',
    latitude: 12.97,
    longitude: 77.59,
  }),
  club({
    club_id: '2',
    club_name: 'B',
    district: '3141',
    state: 'Maharashtra',
    city: 'Mumbai',
    latitude: 19.07,
    longitude: 72.87,
  }),
]

describe('matchCityPlace', () => {
  const cities = buildCityIndex(clubs)

  it('matches Bangalore alias to Bengaluru', () => {
    const hit = matchCityPlace('Bangalore', cities)
    expect(hit?.label).toBe('Bengaluru')
    expect(hit?.source).toBe('city')
  })

  it('matches city prefix', () => {
    expect(matchCityPlace('bengal', cities)?.city).toBe('Bengaluru')
  })

  it('matches Mumbai', () => {
    expect(matchCityPlace('mumbai', cities)?.city).toBe('Mumbai')
  })
})

describe('matchCityInQuery', () => {
  const cities = buildCityIndex(clubs)

  it('finds Mumbai in ghansoli, mumbai', () => {
    const hit = matchCityInQuery('ghansoli, mumbai', cities)
    expect(hit?.city).toBe('Mumbai')
    expect(hit?.source).toBe('city')
  })

  it('matches alias as a whole word only', () => {
    expect(matchCityInQuery('bombay', cities)?.city).toBe('Mumbai')
  })
})

describe('resolvePlaceSearch', () => {
  const cities = buildCityIndex(clubs)

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves city without network', async () => {
    const hit = await resolvePlaceSearch('bengaluru', cities, {
      allowGeocode: false,
    })
    expect(hit?.source).toBe('city')
    expect(hit?.lat).toBeCloseTo(12.97, 2)
  })

  it('uses Mapbox geocode API then returns place', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          place: {
            lat: 19.1197,
            lng: 72.9951,
            label: 'Ghansoli, Navi Mumbai, India',
            zoom: 13,
            city: 'Mumbai',
          },
        }),
      }),
    )

    const hit = await resolvePlaceSearch('ghansoli, mumbai', cities, {
      allowGeocode: true,
    })
    expect(hit?.source).toBe('place')
    expect(hit?.label).toContain('Ghansoli')
    expect(fetch).toHaveBeenCalled()
  })

  it('falls back to city when geocode misses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ place: null }),
      }),
    )

    const hit = await resolvePlaceSearch('ghansoli, mumbai', cities, {
      allowGeocode: true,
    })
    expect(hit?.source).toBe('city')
    expect(hit?.city).toBe('Mumbai')
  })

  it('surfaces Mapbox 403 as GeocodeConfigError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          place: null,
          reason: 'forbidden',
          error: 'Mapbox rejected the token (403).',
        }),
      }),
    )

    await expect(
      resolvePlaceSearch('kolar', cities, { allowGeocode: true }),
    ).rejects.toMatchObject({ name: 'GeocodeConfigError' })
  })

  it('surfaces 429 rate limit to the visitor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          place: null,
          reason: 'rate_limited',
          error: 'Too many place searches. Please wait a minute and try again.',
        }),
      }),
    )

    const result = await geocodePlace('kolar')
    expect(result.focus).toBeNull()
    expect(result.error).toMatch(/wait a minute/i)
  })
})
