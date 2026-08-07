import { describe, expect, it } from 'vitest'
import { formatDistance, haversineKm } from './haversine'

describe('haversineKm', () => {
  it('returns ~0 for the same point', () => {
    expect(haversineKm(12.97, 77.59, 12.97, 77.59)).toBeLessThan(0.001)
  })

  it('estimates Bengaluru to Mumbai around 840 km', () => {
    const km = haversineKm(12.9716, 77.5946, 19.076, 72.8777)
    expect(km).toBeGreaterThan(800)
    expect(km).toBeLessThan(900)
  })
})

describe('formatDistance', () => {
  it('formats metres under 1 km', () => {
    expect(formatDistance(0.24)).toBe('240 m away')
  })

  it('formats short kilometres with one decimal', () => {
    expect(formatDistance(2.4)).toBe('2.4 km away')
  })
})
