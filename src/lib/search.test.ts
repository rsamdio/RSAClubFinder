import { describe, expect, it } from 'vitest'
import type { Club } from '../types/club'
import { createClubIndex, filterClubs, hasStrongClubMatch } from './search'
import { EMPTY_FILTERS } from '../types/club'

function club(partial: Partial<Club> & Pick<Club, 'club_id' | 'club_name' | 'city'>): Club {
  return {
    club_type: 'community',
    district: '3192',
    zone: 'Zone 4',
    country: 'India',
    state: 'Karnataka',
    latitude: 12.93,
    longitude: 77.61,
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
    club_id: '100001',
    club_name: 'Rotaract Club of Christ University',
    club_type: 'university',
    city: 'Bengaluru',
  }),
  club({
    club_id: '100002',
    club_name: 'Rotaract Club of Colombo Central',
    district: '3220',
    zone: 'Zone 7',
    country: 'Sri Lanka',
    state: 'Western Province',
    city: 'Colombo',
    latitude: 6.93,
    longitude: 79.86,
  }),
]

describe('filterClubs', () => {
  const fuse = createClubIndex(clubs)

  it('matches multi-token club + city queries', () => {
    const results = filterClubs(clubs, fuse, {
      ...EMPTY_FILTERS,
      q: 'Christ Bengaluru',
    })
    expect(results.map((c) => c.club_id)).toContain('100001')
  })

  it('filters by country and type', () => {
    const results = filterClubs(clubs, fuse, {
      ...EMPTY_FILTERS,
      country: 'Sri Lanka',
      type: 'community',
    })
    expect(results).toHaveLength(1)
    expect(results[0].club_id).toBe('100002')
  })

  it('sorts by distance in place mode', () => {
    const results = filterClubs(clubs, fuse, EMPTY_FILTERS, {
      origin: { lat: 12.97, lng: 77.59 },
      placeMode: true,
      radiusKm: 50,
      maxResults: 15,
    })
    expect(results[0].club_id).toBe('100001')
    expect(results[0].distanceKm).toBeLessThan(5)
  })


  it('requires strong club substring match (not fuzzy kolar→Kolkata)', () => {
    expect(hasStrongClubMatch(clubs, 'Christ')).toBe(true)
    expect(hasStrongClubMatch(clubs, 'kolar')).toBe(false)
    expect(hasStrongClubMatch(clubs, 'KGF')).toBe(false)
  })
})
