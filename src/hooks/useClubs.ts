import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import type { Club, ClubsDataset } from '../types/club'
import { createClubIndex } from '../lib/search'

let cachedClubs: Club[] | null = null
let fetchPromise: Promise<Club[]> | null = null

async function fetchClubsWithRetry(retries = 1): Promise<Club[]> {
  if (cachedClubs) return cachedClubs
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    let attempt = 0
    while (attempt <= retries) {
      try {
        const res = await fetch('/data/clubs.json')
        if (!res.ok) throw new Error('Could not load clubs right now. Please refresh and try again.')
        const data = (await res.json()) as ClubsDataset
        cachedClubs = data.clubs
        return data.clubs
      } catch (err) {
        attempt++
        if (attempt > retries) {
          fetchPromise = null
          throw err
        }
        await new Promise((r) => setTimeout(r, 800))
      }
    }
    fetchPromise = null
    throw new Error('Could not load clubs right now. Please refresh and try again.')
  })()

  return fetchPromise
}

export function useClubs() {
  const [clubs, setClubs] = useState<Club[]>(() => cachedClubs ?? [])
  const [loading, setLoading] = useState(() => !cachedClubs)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cachedClubs) return

    let cancelled = false
    void fetchClubsWithRetry()
      .then((data) => {
        if (!cancelled) {
          setClubs(data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load clubs right now. Please refresh and try again.',
          )
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const fuse = useMemo(() => (clubs.length ? createClubIndex(clubs) : null), [clubs])

  return { clubs, fuse: fuse as Fuse<Club> | null, loading, error }
}
