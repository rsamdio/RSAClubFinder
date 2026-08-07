import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AnalyticsRouteListener } from './components/AnalyticsRouteListener'
import { FinderApp } from './components/FinderApp'

/**
 * /about and /how-to-find are static HTML (public/), not React screens.
 * Exclude them from the catch-all so a mis-served SPA does not soft-redirect
 * crawlers into the finder. Vite + Netlify must serve the real HTML files.
 */
function StaticDocPlaceholder() {
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AnalyticsRouteListener />
      <Routes>
        <Route path="/" element={<FinderApp />} />
        <Route path="/club/:clubId" element={<FinderApp />} />
        <Route path="/clubs" element={<Navigate to="/" replace />} />
        <Route path="/about" element={<StaticDocPlaceholder />} />
        <Route path="/about/*" element={<StaticDocPlaceholder />} />
        <Route path="/how-to-find" element={<StaticDocPlaceholder />} />
        <Route path="/how-to-find/*" element={<StaticDocPlaceholder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
