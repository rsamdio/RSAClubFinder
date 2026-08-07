import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/** Sends a GA4 page_view on client-side route changes (SPA). */
export function AnalyticsRouteListener() {
  const location = useLocation()

  useEffect(() => {
    window.gtag?.('event', 'page_view', {
      page_path: `${location.pathname}${location.search}`,
      page_title: document.title,
    })
  }, [location.pathname, location.search])

  return null
}
