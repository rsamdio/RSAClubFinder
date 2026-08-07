import { describe, expect, it } from 'vitest'
import {
  filtersFromSearchParams,
  searchParamsFromFilters,
} from './urlState'
import { EMPTY_FILTERS } from '../types/club'

describe('url state', () => {
  it('round-trips filters through search params', () => {
    const filters = {
      ...EMPTY_FILTERS,
      q: 'Bengaluru',
      country: 'India',
      district: '3192',
      type: 'university' as const,
    }
    const params = searchParamsFromFilters(filters)
    expect(params.get('q')).toBe('Bengaluru')
    expect(params.get('type')).toBe('university')
    expect(params.get('nearMe')).toBeNull()
    expect(filtersFromSearchParams(params)).toEqual({
      ...filters,
      nearMe: false,
    })
  })

  it('ignores legacy nearMe query param (locate is one-shot)', () => {
    const params = new URLSearchParams('nearMe=1&q=Delhi')
    const filters = filtersFromSearchParams(params)
    expect(filters.nearMe).toBe(false)
    expect(filters.q).toBe('Delhi')
  })

  it('maps legacy institution type to university', () => {
    const params = new URLSearchParams('type=institution')
    expect(filtersFromSearchParams(params).type).toBe('university')
  })

  it('ignores invalid enum values and legacy status params', () => {
    const params = new URLSearchParams('type=mystery&status=active')
    const filters = filtersFromSearchParams(params)
    expect(filters.type).toBe('')
    expect('status' in filters).toBe(false)
  })
})
