import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import type { Club, ClubsDataset } from '../types/club'
import { createClubIndex } from '../lib/search'

export function useClubs() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/data/clubs.json')
        if (!res.ok) throw new Error('Could not load clubs right now. Please refresh and try again.')
        const data = (await res.json()) as ClubsDataset
        if (!cancelled) {
          setClubs(data.clubs)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load clubs right now. Please refresh and try again.',
          )
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const fuse = useMemo(() => (clubs.length ? createClubIndex(clubs) : null), [clubs])

  return { clubs, fuse: fuse as Fuse<Club> | null, loading, error }
}
