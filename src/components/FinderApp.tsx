import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { ClubFilters } from '../types/club'
import { filterClubs, hasStrongClubMatch } from '../lib/search'
import {
  filtersEqual,
  filtersFromSearchParams,
  searchParamsFromFilters,
} from '../lib/urlState'
import {
  buildCityIndex,
  clubsNearPoint,
  clubsNearPointAdaptive,
  looksLikePlaceQuery,
  matchCityPlace,
  resolvePlaceSearch,
  type PlaceFocus,
} from '../lib/places'
import { MAP_BROWSE_MIN_ZOOM } from '../lib/mapTiles'
import { haversineKm } from '../lib/haversine'
import { useClubs } from '../hooks/useClubs'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { useNearMe } from '../hooks/useNearMe'
import { IDLE_MAP_MARKER_CAP, MapView, type MapViewState } from './MapView'
import { SearchBar } from './SearchBar'
import { FilterPanel } from './FilterPanel'
import { ClubList } from './ClubList'
import { ClubDetail } from './ClubDetail'
import { BottomSheet, type SheetSnap } from './BottomSheet'
import { LocationPrompt } from './LocationPrompt'
import { Toast } from './Toast'

const LOCATION_PROMPT_KEY = 'rsamdio-cf-welcome-location'

function writeQueryToUrl(filters: ClubFilters) {
  const params = searchParamsFromFilters(filters)
  const qs = params.toString()
  const path = `${window.location.pathname}${qs ? `?${qs}` : ''}`
  // Avoid React Router setSearchParams — it re-renders the whole tree and flickers the input.
  window.history.replaceState(window.history.state, '', path)
}

export function FinderApp() {
  const { clubs, fuse, loading, error } = useClubs()
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const params = useParams()
  const clubId = params.clubId ?? null
  const [searchParams] = useSearchParams()
  const { location: myLocation, locating, error: nearMeError, requestLocation } =
    useNearMe()
  const placeFocusRef = useRef<PlaceFocus | null>(null)
  const locateAnchorRef = useRef<{ lat: number; lng: number } | null>(null)
  const locateSettledRef = useRef(false)
  const [mePulseKey, setMePulseKey] = useState(0)
  const [recenterKey, setRecenterKey] = useState(0)

  const initialFilters = useMemo(
    () => filtersFromSearchParams(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only seed from URL
    [],
  )

  const [filters, setFilters] = useState<ClubFilters>(initialFilters)
  const [committedQuery, setCommittedQuery] = useState(initialFilters.q)
  const [showFilters, setShowFilters] = useState(false)
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('half')
  const [placeFocus, setPlaceFocus] = useState<PlaceFocus | null>(null)
  const [placeRadiusKm, setPlaceRadiusKm] = useState<number | null>(null)
  const [placeMaxResults, setPlaceMaxResults] = useState<number | null>(null)
  const [placeStatus, setPlaceStatus] = useState<string | null>(null)
  const [resolvingPlace, setResolvingPlace] = useState(false)
  /** When true, hide fuzzy club dumps after a failed place lookup. */
  const [placeMiss, setPlaceMiss] = useState(false)
  const [searchEpoch, setSearchEpoch] = useState(0)
  const [mapView, setMapView] = useState<MapViewState | null>(null)
  /** Remembers last city so neighbourhood searches can bias place lookup. */
  const cityContextRef = useRef<string | null>(initialFilters.city || null)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [locationPromptBusy, setLocationPromptBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const geocodeAbort = useRef<AbortController | null>(null)
  const cityIndex = useMemo(() => buildCityIndex(clubs), [clubs])

  placeFocusRef.current = placeFocus

  const activeFilters = useMemo(
    () => ({ ...filters, q: committedQuery, nearMe: false }),
    [filters, committedQuery],
  )

  useEffect(() => {
    writeQueryToUrl(activeFilters)
  }, [activeFilters])

  useEffect(() => {
    function onPopState() {
      const fromUrl = filtersFromSearchParams(
        new URLSearchParams(window.location.search),
      )
      setFilters((prev) => {
        const next = { ...fromUrl, q: prev.q }
        return filtersEqual(
          { ...prev, q: '' },
          { ...next, q: '' },
        )
          ? prev
          : { ...fromUrl, q: committedQuery }
      })
      setCommittedQuery(fromUrl.q)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [committedQuery])

  // First visit: friendly location invite (before the browser permission sheet).
  useEffect(() => {
    if (loading || error) return
    if (initialFilters.q.trim().length >= 2) return
    try {
      if (localStorage.getItem(LOCATION_PROMPT_KEY)) return
    } catch {
      return
    }
    const timer = window.setTimeout(() => setShowLocationPrompt(true), 700)
    return () => window.clearTimeout(timer)
  }, [loading, error, initialFilters.q])

  function dismissLocationPrompt() {
    try {
      localStorage.setItem(LOCATION_PROMPT_KEY, '1')
    } catch {
      // ignore
    }
    setShowLocationPrompt(false)
  }

  async function acceptLocationPrompt() {
    setLocationPromptBusy(true)
    try {
      await handleNearMe()
    } finally {
      setLocationPromptBusy(false)
      dismissLocationPrompt()
    }
  }

  const handleSearchCommit = useCallback((q: string) => {
    setCommittedQuery(q)
  }, [])

  const handleMapViewChange = useCallback((view: MapViewState) => {
    setMapView(view)
  }, [])

  // Place resolution after Enter / URL commit (not while typing)
  useEffect(() => {
    geocodeAbort.current?.abort()
    geocodeAbort.current = null

    const q = committedQuery.trim()
    if (q.length < 2) {
      // Keep a one-shot locate focus; only clear search-driven place/city focus.
      if (placeFocusRef.current?.source !== 'user') {
        setPlaceFocus(null)
        setPlaceRadiusKm(null)
        setPlaceMaxResults(null)
        setPlaceStatus(null)
      }
      setPlaceMiss(false)
      setResolvingPlace(false)
      return
    }

    if (!clubs.length) {
      setResolvingPlace(true)
      return
    }

    const placeLike = looksLikePlaceQuery(q, cityIndex)
    const cityExact = matchCityPlace(q, cityIndex)
    const strongClub = hasStrongClubMatch(clubs, q)

    // Club-name intent: substring match only (never Fuse “kolar”→Kolkata)
    if (!placeLike && !cityExact && strongClub) {
      setPlaceFocus(null)
      setPlaceRadiusKm(null)
      setPlaceMaxResults(null)
      setPlaceStatus(null)
      setPlaceMiss(false)
      setResolvingPlace(false)
      return
    }

    // Clear stale place focus immediately so prior area results don't linger while resolving.
    if (placeFocusRef.current?.source !== 'user') {
      setPlaceFocus(null)
      setPlaceRadiusKm(null)
      setPlaceMaxResults(null)
      setPlaceStatus(null)
    }
    setResolvingPlace(true)
    const controller = new AbortController()
    geocodeAbort.current = controller

    // Sticky city context only helps neighbourhood queries; bare places (Kolar, KGF) must not
    // inherit "Mumbai" from a previous Ghansoli search.
    const cityContext = placeLike ? cityContextRef.current : null

    void resolvePlaceSearch(q, cityIndex, {
      signal: controller.signal,
      cityContext,
      allowGeocode: true,
    })
      .then((focus) => {
        if (controller.signal.aborted) return
        if (!focus) {
          setPlaceFocus(null)
          setPlaceRadiusKm(null)
          setPlaceMaxResults(null)
          setPlaceMiss(true)
          setPlaceStatus(
            `No place found for “${q}”. Try a city or club name, or pan the map.`,
          )
          setResolvingPlace(false)
          return
        }
        setPlaceMiss(false)
        applyPlaceFocus(focus)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setPlaceFocus(null)
        setPlaceRadiusKm(null)
        setPlaceMaxResults(null)
        setPlaceMiss(true)
        setResolvingPlace(false)
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (err instanceof Error && err.name === 'GeocodeConfigError') {
          setPlaceStatus(err.message)
          return
        }
        setPlaceStatus(
          `No place found for “${q}”. Try a city or club name, or pan the map.`,
        )
      })

    return () => controller.abort()

    function applyPlaceFocus(focus: PlaceFocus) {
      locateAnchorRef.current = null
      locateSettledRef.current = false

      if (focus.source === 'place') {
        const nearest = clubsNearPoint(clubs, focus, 80).slice(0, 15)
        const farthest = nearest[nearest.length - 1]?.distanceKm ?? 12
        const radiusKm = Math.min(22, Math.max(10, Math.ceil(farthest + 0.5)))
        setPlaceFocus(focus)
        setPlaceRadiusKm(radiusKm)
        setPlaceMaxResults(15)
        if (focus.city) cityContextRef.current = focus.city
        setPlaceStatus(
          nearest.length
            ? `${nearest.length} nearest clubs to ${focus.label}`
            : `At ${focus.label}. No mapped clubs nearby yet.`,
        )
        setResolvingPlace(false)
        return
      }

      const radiusKm =
        focus.source === 'user'
          ? clubsNearPointAdaptive(clubs, focus, {
              minResults: 12,
              startKm: 12,
              maxKm: 40,
            }).radiusKm
          : 25

      const nearby = clubsNearPoint(clubs, focus, radiusKm)
      setPlaceFocus(focus)
      setPlaceRadiusKm(radiusKm)
      setPlaceMaxResults(null)
      if (focus.city) cityContextRef.current = focus.city
      setPlaceStatus(
        nearby.length
          ? `${nearby.length} clubs within ~${radiusKm} km of ${focus.label}`
          : `At ${focus.label}. No clubs within ${radiusKm} km yet.`,
      )
      setResolvingPlace(false)
    }
  }, [committedQuery, cityIndex, clubs, fuse])

  const browseMode =
    !clubId &&
    !placeFocus &&
    committedQuery.trim().length < 2 &&
    Boolean(mapView && mapView.zoom >= MAP_BROWSE_MIN_ZOOM)

  const mapBrowseFocus = useMemo<PlaceFocus | null>(() => {
    if (!browseMode || !mapView) return null
    return {
      lat: mapView.lat,
      lng: mapView.lng,
      label: 'Map center',
      source: 'map',
      zoom: mapView.zoom,
    }
  }, [browseMode, mapView])

  const activeFocus = placeFocus ?? mapBrowseFocus

  const activeRadius = useMemo(() => {
    if (placeFocus?.source === 'user') {
      return (
        placeRadiusKm ??
        clubsNearPointAdaptive(clubs, placeFocus, {
          minResults: 15,
          startKm: 15,
          maxKm: 80,
        }).radiusKm
      )
    }
    if (mapBrowseFocus) {
      const nearest = clubsNearPoint(clubs, mapBrowseFocus, 80).slice(0, 15)
      const farthest = nearest[nearest.length - 1]?.distanceKm ?? 20
      return Math.min(40, Math.max(12, Math.ceil(farthest + 0.5)))
    }
    return placeRadiusKm
  }, [placeFocus, clubs, placeRadiusKm, mapBrowseFocus])

  const placeMode = Boolean(placeFocus || mapBrowseFocus)

  // After locate camera settles, pan away to return to free map-browse.
  useEffect(() => {
    if (!mapView || placeFocus?.source !== 'user' || !locateAnchorRef.current) {
      return
    }
    const movedKm = haversineKm(
      mapView.lat,
      mapView.lng,
      locateAnchorRef.current.lat,
      locateAnchorRef.current.lng,
    )
    if (!locateSettledRef.current) {
      if (movedKm < 0.75) locateSettledRef.current = true
      return
    }
    if (movedKm < 1.5) return
    locateAnchorRef.current = null
    locateSettledRef.current = false
    setPlaceFocus(null)
    setPlaceRadiusKm(null)
    setPlaceMaxResults(null)
    setPlaceStatus(null)
  }, [mapView, placeFocus])

  const results = useMemo(() => {
    // Place lookup failed: show empty list — do not dump fuzzy Kolkata/Karachi clubs
    if (placeMiss && !placeFocus) {
      return []
    }
    // Club-name search: attributes + strong substring only (no Fuse near-misses)
    if (
      !placeMode &&
      committedQuery.trim().length >= 2 &&
      hasStrongClubMatch(clubs, committedQuery)
    ) {
      return filterClubs(
        clubs,
        null,
        { ...activeFilters, q: '' },
        {},
      ).filter((c) => hasStrongClubMatch([c], committedQuery))
    }
    // Typed query that isn't a strong club / place hit yet → don't fuzzy-list
    if (
      !placeMode &&
      committedQuery.trim().length >= 2 &&
      !placeFocus
    ) {
      return []
    }
    return filterClubs(clubs, fuse, activeFilters, {
      origin: activeFocus,
      radiusKm: placeMode ? activeRadius : null,
      placeMode,
      maxResults: placeMode
        ? placeMaxResults ?? (mapBrowseFocus ? 15 : null)
        : null,
    })
  }, [
    clubs,
    fuse,
    activeFilters,
    activeFocus,
    activeRadius,
    placeMode,
    placeMaxResults,
    mapBrowseFocus,
    placeMiss,
    placeFocus,
    committedQuery,
  ])

  const selectedClub = useMemo(() => {
    if (!clubId) return null
    return clubs.find((c) => c.club_id === clubId) ?? null
  }, [clubs, clubId])

  const selectedInResults = useMemo(() => {
    if (!selectedClub) return null
    return results.find((c) => c.club_id === selectedClub.club_id) ?? selectedClub
  }, [results, selectedClub])

  function updateFilters(next: ClubFilters) {
    setFilters({ ...next, q: committedQuery })
  }

  const onSelectClub = useCallback(
    (nextId: string) => {
      const qs = searchParamsFromFilters(activeFilters).toString()
      navigate(`/club/${nextId}${qs ? `?${qs}` : ''}`)
      if (!isDesktop) setSheetSnap('half')
    },
    [activeFilters, navigate, isDesktop],
  )

  function clearSelection() {
    const qs = searchParamsFromFilters(activeFilters).toString()
    navigate(qs ? `/?${qs}` : '/')
  }

  async function handleNearMe() {
    try {
      const pos = await requestLocation()
      setCommittedQuery('')
      setSearchEpoch((n) => n + 1)
      setFilters((f) => ({ ...f, nearMe: false, q: '' }))
      setPlaceMiss(false)

      const { results: nearby, radiusKm } = clubsNearPointAdaptive(clubs, pos, {
        minResults: 15,
        startKm: 15,
        maxKm: 80,
      })

      // One-shot locate session for nearby list. Me pin is standing (myLocation).
      locateAnchorRef.current = { lat: pos.lat, lng: pos.lng }
      locateSettledRef.current = false
      setMePulseKey((n) => n + 1)
      setPlaceFocus({
        lat: pos.lat,
        lng: pos.lng,
        label: 'You are here',
        source: 'user',
        zoom: 13,
      })
      setPlaceRadiusKm(radiusKm)
      setPlaceMaxResults(15)
      setPlaceStatus(
        nearby.length
          ? `${nearby.length} clubs within ~${Math.round(radiusKm)} km of you`
          : 'No clubs found near your location',
      )
      if (clubId) {
        const qs = searchParamsFromFilters({
          ...activeFilters,
          nearMe: false,
          q: '',
        }).toString()
        navigate(qs ? `/?${qs}` : '/')
      }
      if (!isDesktop) setSheetSnap('half')
    } catch {
      // nearMeError surfaced near the Near me control
    }
  }

  function handleRecenter() {
    if (!myLocation || locating) return
    setRecenterKey((n) => n + 1)
  }

  async function shareClub() {
    if (!selectedClub) return
    const url = `${window.location.origin}/club/${selectedClub.club_id}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedClub.club_name,
          text: `Find ${selectedClub.club_name} on Club Finder by Rotaract South Asia MDIO`,
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setToast('Club link copied')
      }
    } catch {
      // cancelled
    }
  }

  async function copySearchLink() {
    writeQueryToUrl(activeFilters)
    try {
      await navigator.clipboard.writeText(window.location.href)
      setToast('Search link copied')
    } catch {
      setToast('Could not copy link. Copy it from the address bar.')
    }
  }

  const browseStatus =
    browseMode && results.length
      ? `${results.length} clubs near map center. Pan to explore.`
      : null

  const statusLine = locating
    ? 'Getting your location…'
    : resolvingPlace
      ? 'Finding that place…'
      : placeStatus ?? browseStatus

  const autoFitResults =
    !placeFocus &&
    !browseMode &&
    committedQuery.trim().length >= 2 &&
    hasStrongClubMatch(clubs, committedQuery)

  const clubMissing = Boolean(clubId) && !loading && !selectedClub

  const mapMarkerCap =
    placeMode || autoFitResults ? null : IDLE_MAP_MARKER_CAP

  const mapClubs = useMemo(() => {
    if (!selectedInResults) return results
    if (results.some((c) => c.club_id === selectedInResults.club_id)) return results
    return [...results, selectedInResults]
  }, [results, selectedInResults])

  const sheetForLayout = selectedInResults || clubId ? 'half' : sheetSnap
  const showRecenter =
    Boolean(myLocation) && (isDesktop || sheetForLayout !== 'full')

  const panelBody = selectedInResults ? (
    <ClubDetail
      club={selectedInResults}
      onClose={clearSelection}
      onShare={() => void shareClub()}
    />
  ) : clubMissing ? (
    <div className="club-list club-list--empty" role="status">
      <p>Club not found.</p>
      <p className="muted">This link may be outdated, or the club is no longer listed.</p>
      <button type="button" className="btn btn--near" onClick={clearSelection}>
        Back to all clubs
      </button>
    </div>
  ) : (
    <>
      <div className="panel__chrome">
        <div className="panel__toolbar">
          <SearchBar
            key={searchEpoch}
            initialValue={searchEpoch === 0 ? initialFilters.q : ''}
            onCommit={handleSearchCommit}
          />
          <button
            type="button"
            className={`btn btn--filter ${showFilters ? 'is-active' : ''}`}
            onClick={() => {
              setShowFilters((v) => !v)
              if (!isDesktop) setSheetSnap('full')
            }}
            aria-expanded={showFilters}
          >
            Filters
          </button>
        </div>

        {statusLine ? (
          <p className="panel__place-status" aria-live="polite">
            {statusLine}
          </p>
        ) : null}

        <div className="panel__quick">
          <button
            type="button"
            className="btn btn--near btn--sm"
            onClick={() => void handleNearMe()}
            disabled={locating}
          >
            {locating ? 'Locating…' : 'Near me'}
          </button>
          <p className="panel__count" aria-live="polite">
            {loading ? 'Loading clubs…' : `${results.length.toLocaleString()} clubs`}
          </p>
        </div>
        {nearMeError ? (
          <p className="panel__near-error" role="alert">
            {nearMeError}
          </p>
        ) : null}
      </div>

      <div className={`panel__body ${showFilters ? 'panel__body--filters' : ''}`}>
        {showFilters ? (
          <FilterPanel
            clubs={clubs}
            filters={activeFilters}
            onChange={updateFilters}
            compact={!isDesktop}
            resultCount={results.length}
            onDone={() => {
              setShowFilters(false)
              if (!isDesktop) setSheetSnap('half')
            }}
            doneLabel={isDesktop ? 'Done' : 'Show results'}
            onCopyLink={() => void copySearchLink()}
          />
        ) : loading ? (
          <div className="club-list club-list--empty" role="status">
            <p>Loading clubs…</p>
          </div>
        ) : (
          <ClubList
            clubs={results}
            selectedClubId={clubId}
            onSelect={onSelectClub}
            showDistance={Boolean(activeFocus)}
          />
        )}
      </div>
    </>
  )

  return (
    <div
      className={`finder ${isDesktop ? 'finder--desktop' : 'finder--mobile'}`}
      data-sheet={isDesktop ? undefined : sheetForLayout}
    >
      <header className="finder__brand">
        <a
          className="finder__brand-mark"
          href="https://rsamdio.org"
          target="_blank"
          rel="noopener noreferrer"
          title="Rotaract South Asia MDIO"
        >
          <img
            className="finder__brand-logo"
            src="/brand/rsamdio.webp"
            alt="Rotaract South Asia MDIO"
            width={168}
            height={87}
          />
          <span className="finder__brand-product">
            <span className="finder__brand-product-label">Club Finder</span>
            <span className="finder__brand-product-tag">South Asia</span>
          </span>
        </a>
      </header>

      <div className="finder__map">
        <MapView
          clubs={mapClubs}
          selectedClubId={clubId}
          onSelectClub={onSelectClub}
          focusPoint={placeFocus}
          focusClub={selectedInResults}
          myLocation={myLocation}
          mePulseKey={mePulseKey}
          recenterKey={recenterKey}
          radiusKm={placeFocus && placeMode ? activeRadius : null}
          trackView={(!placeFocus || placeFocus.source === 'user') && !clubId}
          autoFitResults={autoFitResults}
          markerCap={mapMarkerCap}
          onViewChange={handleMapViewChange}
        />
        {showRecenter ? (
          <button
            type="button"
            className="map-recenter"
            onClick={handleRecenter}
            disabled={locating}
            aria-label="Recenter map on my location"
            title="Recenter on me"
          >
            <span className="map-recenter__icon" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="finder__banner finder__banner--error" role="alert">
          {error}
        </div>
      ) : null}

      <LocationPrompt
        open={showLocationPrompt}
        busy={locationPromptBusy}
        onAllow={() => void acceptLocationPrompt()}
        onDismiss={dismissLocationPrompt}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />

      {isDesktop ? (
        <aside className="finder__panel">{panelBody}</aside>
      ) : (
        <BottomSheet snap={selectedClub ? 'half' : sheetSnap} onSnapChange={setSheetSnap}>
          {panelBody}
        </BottomSheet>
      )}
    </div>
  )
}
