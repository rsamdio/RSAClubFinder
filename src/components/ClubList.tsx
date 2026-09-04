import { useEffect, useRef, useState } from 'react'
import type { ClubWithDistance } from '../types/club'
import { formatDistance } from '../lib/haversine'

interface ClubListProps {
  clubs: ClubWithDistance[]
  selectedClubId: string | null
  onSelect: (clubId: string) => void
  showDistance?: boolean
}

const INITIAL_BATCH = 60
const BATCH_STEP = 60

export function ClubList({
  clubs,
  selectedClubId,
  onSelect,
  showDistance = false,
}: ClubListProps) {
  const [displayCount, setDisplayCount] = useState(INITIAL_BATCH)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDisplayCount(INITIAL_BATCH)
  }, [clubs])

  useEffect(() => {
    if (!selectedClubId) return
    const idx = clubs.findIndex((c) => c.club_id === selectedClubId)
    if (idx >= displayCount) {
      setDisplayCount(idx + 20)
    }
  }, [selectedClubId, clubs, displayCount])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    if (displayCount >= clubs.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDisplayCount((prev) => Math.min(prev + BATCH_STEP, clubs.length))
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [displayCount, clubs.length])

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

  const visibleClubs = clubs.slice(0, displayCount)

  return (
    <ul className="club-list" role="listbox" aria-label="Club results">
      {visibleClubs.map((club) => {
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
      {displayCount < clubs.length ? (
        <li role="presentation" aria-hidden="true">
          <div ref={sentinelRef} style={{ height: 1 }} />
        </li>
      ) : null}
    </ul>
  )
}
