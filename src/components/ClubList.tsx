import type { ClubWithDistance } from '../types/club'
import { formatDistance } from '../lib/haversine'

interface ClubListProps {
  clubs: ClubWithDistance[]
  selectedClubId: string | null
  onSelect: (clubId: string) => void
  showDistance?: boolean
}

export function ClubList({
  clubs,
  selectedClubId,
  onSelect,
  showDistance = false,
}: ClubListProps) {
  if (clubs.length === 0) {
    return (
      <div className="club-list club-list--empty" role="status">
        <p>No clubs match your search.</p>
        <p className="muted">
          Try a city or club name, filter by district or type, explore the map,
          or clear filters.
        </p>
      </div>
    )
  }

  return (
    <ul className="club-list" role="listbox" aria-label="Club results">
      {clubs.map((club) => {
        const selected = club.club_id === selectedClubId
        return (
          <li key={club.club_id} role="presentation">
            <button
              type="button"
              className={`club-list__item ${selected ? 'is-selected' : ''}`}
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(club.club_id)}
            >
              <span className="club-list__name">{club.club_name}</span>
              <span className="club-list__meta">
                {club.city}, {club.country}
                <span className="dot" aria-hidden="true">
                  ·
                </span>
                D{club.district}
                {showDistance && club.distanceKm != null ? (
                  <>
                    <span className="dot" aria-hidden="true">
                      ·
                    </span>
                    <span className="club-list__distance">
                      {formatDistance(club.distanceKm)}
                    </span>
                  </>
                ) : null}
              </span>
              <span className={`club-list__type club-list__type--${club.club_type}`}>
                {club.club_type === 'university' ? 'University' : 'Community'}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
