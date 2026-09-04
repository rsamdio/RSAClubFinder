import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * SPA page views after the first load.
 * Initial land is sent from index.html (before React) so bounce-before-hydrate
 * still counts. This listener skips that first path, then fires on navigations.
 */
export function AnalyticsRouteListener() {
  const location = useLocation()
  const isFirstPath = useRef(true)

  useEffect(() => {
    if (isFirstPath.current) {
      isFirstPath.current = false
      return
    }

    const timer = window.setTimeout(() => {
      window.gtag?.('event', 'page_view', {
        page_path: `${location.pathname}${location.search}`,
        page_location: window.location.href,
        page_title: document.title,
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search])

  return null
}
