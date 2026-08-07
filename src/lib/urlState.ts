import type { ClubFilters, ClubType } from '../types/club'
import { EMPTY_FILTERS } from '../types/club'

function parseClubType(value: string | null): '' | ClubType {
  if (value === 'community' || value === 'university') return value
  if (value === 'institution') return 'university'
  return ''
}

export function filtersFromSearchParams(params: URLSearchParams): ClubFilters {
  return {
    q: params.get('q') ?? '',
    country: params.get('country') ?? '',
    state: params.get('state') ?? '',
    city: params.get('city') ?? '',
    district: params.get('district') ?? '',
    zone: params.get('zone') ?? '',
    type: parseClubType(params.get('type')),
    // Legacy ?nearMe=1 / ?status= links are ignored.
    nearMe: false,
  }
}

export function searchParamsFromFilters(filters: ClubFilters): URLSearchParams {
  const params = new URLSearchParams()
  const entries: Array<[keyof ClubFilters, string | boolean]> = [
    ['q', filters.q],
    ['country', filters.country],
    ['state', filters.state],
    ['city', filters.city],
    ['district', filters.district],
    ['zone', filters.zone],
    ['type', filters.type],
  ]

  for (const [key, value] of entries) {
    if (typeof value === 'string' && value) params.set(key, value)
  }
  return params
}

export function filtersEqual(a: ClubFilters, b: ClubFilters): boolean {
  return (
    a.q === b.q &&
    a.country === b.country &&
    a.state === b.state &&
    a.city === b.city &&
    a.district === b.district &&
    a.zone === b.zone &&
    a.type === b.type &&
    a.nearMe === b.nearMe
  )
}

export { EMPTY_FILTERS }
