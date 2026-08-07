import { describe, expect, it } from 'vitest'
import {
  expandGeocodeQuery,
  shouldBiasGeocodeToCity,
} from '../../shared/mapboxGeocode'

describe('expandGeocodeQuery', () => {
  it('expands tiny aliases only', () => {
    expect(expandGeocodeQuery('KGF')).toContain('Kolar Gold Fields')
    expect(expandGeocodeQuery('kolar')).toContain('Kolar')
    expect(expandGeocodeQuery('Ghansoli')).toBe('Ghansoli')
  })
})

describe('shouldBiasGeocodeToCity', () => {
  it('biases neighbourhood-style queries only', () => {
    expect(shouldBiasGeocodeToCity('Ghansoli road')).toBe(true)
    expect(shouldBiasGeocodeToCity('Koramangala layout')).toBe(true)
    expect(shouldBiasGeocodeToCity('Kolar')).toBe(false)
    expect(shouldBiasGeocodeToCity('KGF')).toBe(false)
    expect(shouldBiasGeocodeToCity('Andheri, Mumbai')).toBe(false)
  })
})
