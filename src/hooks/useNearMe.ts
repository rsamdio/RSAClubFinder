import { useCallback, useState } from 'react'

export interface UserLocation {
  lat: number
  lng: number
}

export function useNearMe() {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Location is not supported on this device.')
      return Promise.reject(new Error('unsupported'))
    }

    setLocating(true)
    setError(null)

    return new Promise<UserLocation>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }
          setLocation(next)
          setLocating(false)
          resolve(next)
        },
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied. Enable it in browser settings to use Near Me.'
              : 'Could not get your location. Try again.'
          setError(message)
          setLocating(false)
          reject(err)
        },
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
      )
    })
  }, [])

  const clearLocation = useCallback(() => {
    setLocation(null)
    setError(null)
  }, [])

  return { location, locating, error, requestLocation, clearLocation }
}
