import { memo, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import type { ClubWithDistance } from '../types/club'
import type { PlaceFocus } from '../lib/places'
import {
  getTileConfig,
  SOUTH_ASIA_CENTER,
  SOUTH_ASIA_ZOOM,
} from '../lib/mapTiles'

/** Idle map hard-cap — browse/place lists stay ~15 in FinderApp. */
export const IDLE_MAP_MARKER_CAP = 300

const DEFAULT_ICON = L.divIcon({
  className: 'club-marker',
  html: '<span class="club-marker__pin" aria-hidden="true"></span>',
  iconSize: [28, 36],
  iconAnchor: [14, 34],
  popupAnchor: [0, -30],
  tooltipAnchor: [0, -28],
})

const SELECTED_ICON = L.divIcon({
  className: 'club-marker club-marker--selected',
  html: '<span class="club-marker__pin" aria-hidden="true"></span>',
  iconSize: [36, 44],
  iconAnchor: [18, 42],
  popupAnchor: [0, -36],
  tooltipAnchor: [0, -34],
})

L.Marker.prototype.options.icon = DEFAULT_ICON

function tipForClub(club: ClubWithDistance): string {
  return club.distanceKm != null
    ? `${club.club_name} · ${club.distanceKm < 10 ? club.distanceKm.toFixed(1) : Math.round(club.distanceKm)} km`
    : club.club_name
}

export interface MapViewState {
  lat: number
  lng: number
  zoom: number
}

interface MapViewProps {
  clubs: ClubWithDistance[]
  selectedClubId: string | null
  onSelectClub: (clubId: string) => void
  focusPoint: PlaceFocus | null
  focusClub: ClubWithDistance | null
  radiusKm?: number | null
  /** Debounced map center/zoom for browse-nearby mode. */
  onViewChange?: (view: MapViewState) => void
  trackView?: boolean
  /**
   * When true, fit the camera to the current marker set (club-name search only).
   * Must stay false during map browse so list updates never steal zoom/pan.
   */
  autoFitResults?: boolean
  /** Cap markers on idle / wide views (default 300). */
  markerCap?: number | null
}

function MapViewComponent({
  clubs,
  selectedClubId,
  onSelectClub,
  focusPoint,
  focusClub,
  radiusKm = null,
  onViewChange,
  trackView = false,
  autoFitResults = false,
  markerCap = IDLE_MAP_MARKER_CAP,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const focusLayerRef = useRef<L.LayerGroup | null>(null)
  const markersById = useRef(new Map<string, L.Marker>())
  const lastFocusKey = useRef<string>('')
  const lastMarkersKey = useRef<string>('')
  const lastClubFlyId = useRef<string>('')
  const onSelectClubRef = useRef(onSelectClub)
  const onViewChangeRef = useRef(onViewChange)
  const flyingRef = useRef(false)

  function beginFlight(ms = 700) {
    flyingRef.current = true
    window.setTimeout(() => {
      flyingRef.current = false
    }, ms)
  }

  useEffect(() => {
    onSelectClubRef.current = onSelectClub
  }, [onSelectClub])

  useEffect(() => {
    onViewChangeRef.current = onViewChange
  }, [onViewChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const tiles = getTileConfig()
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(SOUTH_ASIA_CENTER, SOUTH_ASIA_ZOOM)

    L.control.zoom({ position: 'topright' }).addTo(map)

    L.tileLayer(tiles.url, {
      attribution: tiles.attribution,
      maxZoom: tiles.maxZoom,
      subdomains: tiles.subdomains,
    }).addTo(map)

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
      animate: false,
    })
    map.addLayer(cluster)

    const focusLayer = L.layerGroup().addTo(map)

    mapRef.current = map
    clusterRef.current = cluster
    focusLayerRef.current = focusLayer

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false })
    })
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      clusterRef.current = null
      focusLayerRef.current = null
    }
  }, [])

  // Debounced view reporting for map-center browse
  useEffect(() => {
    const map = mapRef.current
    if (!map || !trackView) return

    let timer: number | undefined
    const emit = () => {
      if (flyingRef.current) return
      const c = map.getCenter()
      onViewChangeRef.current?.({
        lat: c.lat,
        lng: c.lng,
        zoom: map.getZoom(),
      })
    }
    const onMoveEnd = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(emit, 280)
    }

    map.on('moveend', onMoveEnd)
    emit()
    return () => {
      map.off('moveend', onMoveEnd)
      window.clearTimeout(timer)
    }
  }, [trackView])

  const displayClubs = (() => {
    let list =
      markerCap != null && clubs.length > markerCap
        ? clubs
            .filter((c) => c.latitude != null && c.longitude != null)
            .slice(0, markerCap)
        : clubs

    // Keep the open club visible even if it falls outside an idle marker cap.
    if (selectedClubId || focusClub) {
      const keep =
        focusClub ??
        clubs.find((c) => c.club_id === selectedClubId) ??
        null
      if (
        keep &&
        keep.latitude != null &&
        keep.longitude != null &&
        !list.some((c) => c.club_id === keep.club_id)
      ) {
        list = [...list, keep]
      }
    }
    return list
  })()

  // Markers: rebuild only when the club id set actually changes
  const markersKey = displayClubs.map((c) => c.club_id).join('|')
  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return
    if (markersKey === lastMarkersKey.current) {
      return
    }
    lastMarkersKey.current = markersKey

    cluster.clearLayers()
    markersById.current.clear()

    for (const club of displayClubs) {
      if (club.latitude == null || club.longitude == null) continue
      const marker = L.marker([club.latitude, club.longitude], {
        title: club.club_name,
        icon: DEFAULT_ICON,
      })
      marker.bindTooltip(tipForClub(club), {
        direction: 'top',
        offset: [0, -28],
        className: 'club-tooltip',
      })
      marker.on('click', () => onSelectClubRef.current(club.club_id))
      markersById.current.set(club.club_id, marker)
      cluster.addLayer(marker)
    }
  }, [displayClubs, markersKey])

  // Keep selected pin highlighted without rebuilding the whole cluster set
  useEffect(() => {
    for (const [id, marker] of markersById.current) {
      const selected = Boolean(selectedClubId) && id === selectedClubId
      marker.setIcon(selected ? SELECTED_ICON : DEFAULT_ICON)
      marker.setZIndexOffset(selected ? 1000 : 0)
      marker.unbindTooltip()
      const club =
        displayClubs.find((c) => c.club_id === id) ??
        (focusClub?.club_id === id ? focusClub : null)
      const tip = club ? tipForClub(club) : String(marker.options.title || id)
      marker.bindTooltip(tip, {
        direction: 'top',
        offset: selected ? [0, -34] : [0, -28],
        permanent: selected,
        className: selected ? 'club-tooltip club-tooltip--selected' : 'club-tooltip',
      })
      if (selected) marker.openTooltip()
      else marker.closeTooltip()
    }
  }, [selectedClubId, markersKey, displayClubs, focusClub])

  // Focus pin + radius + single fly (never re-fly when club list updates)
  useEffect(() => {
    const map = mapRef.current
    const focusLayer = focusLayerRef.current
    if (!map || !focusLayer) return

    const key = focusPoint
      ? `${focusPoint.source}:${focusPoint.lat.toFixed(5)},${focusPoint.lng.toFixed(5)}:${focusPoint.zoom}:${radiusKm ?? ''}`
      : ''

    if (key === lastFocusKey.current) return
    lastFocusKey.current = key

    focusLayer.clearLayers()

    if (!focusPoint || focusPoint.source === 'map') return

    const label =
      focusPoint.source === 'user' ? 'You are here' : focusPoint.label

    L.circleMarker([focusPoint.lat, focusPoint.lng], {
      radius: focusPoint.source === 'user' ? 9 : 8,
      color: '#9b1249',
      weight: 2,
      fillColor: focusPoint.source === 'user' ? '#f0b429' : '#d41b69',
      fillOpacity: 0.95,
    })
      .bindTooltip(label, { direction: 'top', permanent: false })
      .addTo(focusLayer)

    if (radiusKm != null && radiusKm > 0 && radiusKm <= 25) {
      L.circle([focusPoint.lat, focusPoint.lng], {
        radius: radiusKm * 1000,
        color: '#d41b69',
        weight: 1,
        opacity: 0.35,
        fillColor: '#d41b69',
        fillOpacity: 0.06,
      }).addTo(focusLayer)
    }

    if (flyingRef.current) return
    beginFlight(750)
    if (radiusKm != null && radiusKm > 0 && radiusKm <= 25) {
      const bounds = L.latLng(focusPoint.lat, focusPoint.lng).toBounds(
        radiusKm * 1000 * 2,
      )
      map.flyToBounds(bounds.pad(0.12), {
        duration: 0.55,
        maxZoom: Math.min(focusPoint.zoom, 13),
      })
    } else {
      map.flyTo([focusPoint.lat, focusPoint.lng], focusPoint.zoom, {
        duration: 0.55,
      })
    }
  }, [focusPoint, radiusKm])

  // Fly to selected club even when a place pin is present (pin stays drawn)
  useEffect(() => {
    const map = mapRef.current
    if (!focusClub) {
      lastClubFlyId.current = ''
      return
    }
    if (!map) return
    if (focusClub.latitude == null || focusClub.longitude == null) return
    if (lastClubFlyId.current === focusClub.club_id) return
    lastClubFlyId.current = focusClub.club_id

    beginFlight(800)
    const marker = markersById.current.get(focusClub.club_id)
    if (marker && clusterRef.current) {
      clusterRef.current.zoomToShowLayer(marker, () => {
        marker.setIcon(SELECTED_ICON)
        marker.setZIndexOffset(1000)
        marker.unbindTooltip()
        marker.bindTooltip(tipForClub(focusClub), {
          direction: 'top',
          offset: [0, -34],
          permanent: true,
          className: 'club-tooltip club-tooltip--selected',
        })
        marker.openTooltip()
      })
      return
    }
    map.flyTo([focusClub.latitude, focusClub.longitude], Math.max(map.getZoom(), 13), {
      duration: 0.45,
    })
  }, [focusClub])

  // Intentional club-name search only: never auto-fit during map browse
  const lastResultFitKey = useRef('')
  useEffect(() => {
    const map = mapRef.current
    if (!autoFitResults) {
      lastResultFitKey.current = ''
      return
    }
    if (!map || focusPoint || focusClub || flyingRef.current) return
    const withCoords = displayClubs.filter(
      (c) => c.latitude != null && c.longitude != null,
    )
    if (withCoords.length === 0 || withCoords.length > 40) return
    if (markersKey === lastResultFitKey.current) return
    lastResultFitKey.current = markersKey

    beginFlight(650)
    if (withCoords.length === 1) {
      map.flyTo(
        [withCoords[0].latitude as number, withCoords[0].longitude as number],
        13,
        { duration: 0.5 },
      )
      return
    }
    const bounds = L.latLngBounds(
      withCoords.map((c) => [c.latitude as number, c.longitude as number]),
    )
    map.flyToBounds(bounds.pad(0.25), { duration: 0.5, maxZoom: 13 })
  }, [autoFitResults, displayClubs, focusPoint, focusClub, markersKey])

  return <div ref={containerRef} className="map-view" aria-label="Rotaract clubs map" />
}

export const MapView = memo(MapViewComponent)
