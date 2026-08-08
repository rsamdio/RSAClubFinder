import { describe, expect, it } from 'vitest'
import { validateClubRows } from './lib/validate-clubs.mjs'

const base = {
  club_id: 'RC00001',
  club_name: 'NIT Bengaluru',
  club_type: 'university',
  district: '3192',
  zone: '4',
  country: 'India',
  state: 'Karnataka',
  city: 'Bengaluru',
  latitude: '12.97',
  longitude: '77.59',
  charter_date: '',
  meeting_location: '',
  meeting_day: '',
  meeting_time: '',
  public_email: 'club@example.org',
  website: 'https://example.org',
  instagram: '',
  facebook: '',
  linkedin: '',
  youtube: '',
  description: '',
  last_updated: '2026-08-01',
}

describe('validateClubRows', () => {
  it('prefixes short names and formats zone digits', () => {
    const { clubs, report } = validateClubRows([base])
    expect(report.valid).toBe(true)
    expect(clubs[0].club_name).toBe('Rotaract Club of NIT Bengaluru')
    expect(clubs[0].zone).toBe('Zone 4')
    expect(clubs[0].youtube).toBeNull()
  })

  it('does not double-prefix Rotaract Club of', () => {
    const { clubs, report } = validateClubRows([
      { ...base, club_name: 'Rotaract Club of Mumbai Central' },
    ])
    expect(report.valid).toBe(true)
    expect(clubs[0].club_name).toBe('Rotaract Club of Mumbai Central')
  })

  it('maps legacy institution tag to university', () => {
    const { clubs, report } = validateClubRows([
      { ...base, club_id: 'RC00002', club_type: 'institution' },
    ])
    expect(report.valid).toBe(true)
    expect(clubs[0].club_type).toBe('university')
  })

  it('rejects duplicate ids, bad emails, and phone columns', () => {
    const { report } = validateClubRows([
      { ...base, club_id: 'RC1', public_email: 'not-an-email' },
      { ...base, club_id: 'RC1', public_email: '' },
    ])
    expect(report.valid).toBe(false)
    expect(report.errors.some((e) => e.includes('duplicate club_id'))).toBe(true)
    expect(report.errors.some((e) => e.includes('invalid public_email'))).toBe(true)

    const phone = validateClubRows([{ ...base, phone: '9999999999' }])
    expect(phone.report.valid).toBe(false)
    expect(phone.report.errors.some((e) => e.includes('Forbidden column'))).toBe(
      true,
    )
  })

  it('accepts youtube urls', () => {
    const { clubs, report } = validateClubRows([
      { ...base, youtube: 'https://youtube.com/@club' },
    ])
    expect(report.valid).toBe(true)
    expect(clubs[0].youtube).toBe('https://youtube.com/@club')
  })
})
