import { describe, expect, it } from 'vitest'
import type { Club } from '../types/club'
import { findClubById, normalizeClubIdParam } from './clubId'

function club(id: string): Club {
  return {
    club_id: id,
    club_name: `Rotaract Club of ${id}`,
    club_type: 'community',
    district: '3192',
    zone: 'Zone 4',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    latitude: 12.97,
    longitude: 77.59,
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
  }
}

describe('normalizeClubIdParam', () => {
  it('trims and strips a trailing slash', () => {
    expect(normalizeClubIdParam('  100001/  ')).toBe('100001')
    expect(normalizeClubIdParam('100001/')).toBe('100001')
    expect(normalizeClubIdParam('100001')).toBe('100001')
  })
})

describe('findClubById', () => {
  const clubs = [club('100001'), club('42'), club('RCLegacy')]

  it('matches exact ids', () => {
    expect(findClubById(clubs, '100001')?.club_id).toBe('100001')
    expect(findClubById(clubs, '42')?.club_id).toBe('42')
  })

  it('matches alphanumeric ids case-insensitively and returns dataset casing', () => {
    const found = findClubById(clubs, 'rclegacy')
    expect(found?.club_id).toBe('RCLegacy')
  })

  it('matches id with trailing slash', () => {
    expect(findClubById(clubs, '100001/')?.club_id).toBe('100001')
  })

  it('returns null for unknown or empty', () => {
    expect(findClubById(clubs, '999999')).toBeNull()
    expect(findClubById(clubs, '')).toBeNull()
    expect(findClubById(clubs, null)).toBeNull()
  })
})
