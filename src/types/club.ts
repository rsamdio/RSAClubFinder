export type ClubType = 'community' | 'university'
export type ClubStatus = 'active' | 'inactive' | 'unknown'

export interface Club {
  club_id: string
  club_name: string
  club_type: ClubType
  district: string
  zone: string
  country: string
  state: string | null
  city: string
  latitude: number | null
  longitude: number | null
  charter_date: string | null
  status: ClubStatus
  meeting_location: string | null
  meeting_day: string | null
  meeting_time: string | null
  public_email: string | null
  website: string | null
  instagram: string | null
  facebook: string | null
  linkedin: string | null
  youtube: string | null
  description: string | null
  last_updated: string
}

export interface ClubsDataset {
  version: number
  generated_at: string
  source?: string
  clubs: Club[]
}

export interface ClubFilters {
  q: string
  country: string
  state: string
  city: string
  district: string
  zone: string
  type: '' | ClubType
  nearMe: boolean
}

export interface ClubWithDistance extends Club {
  distanceKm?: number
}

export const EMPTY_FILTERS: ClubFilters = {
  q: '',
  country: '',
  state: '',
  city: '',
  district: '',
  zone: '',
  type: '',
  nearMe: false,
}
