import { memo, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { extendLeaflet } from '@india-boundary-corrector/leaflet-layer'
import type { ClubWithDistance } from '../types/club'
import type { PlaceFocus } from '../lib/places'
import { haversineKm } from '../lib/haversine'
import {
  getAvailableBasemaps,
  SOUTH_ASIA_CENTER,
  SOUTH_ASIA_ZOOM,
} from '../lib/mapTiles'
import { type MapViewState } from '../lib/mapViewTypes'

extendLeaflet(L)

export type { MapViewState } from '../lib/mapViewTypes'

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

function meIcon(pulse: boolean): L.DivIcon {
  return L.divIcon({
    className: pulse ? 'me-marker me-marker--pulse' : 'me-marker',
    html: '<span class="me-marker__ring" aria-hidden="true"></span><span class="me-marker__dot" aria-hidden="true"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

L.Marker.prototype.options.icon = DEFAULT_ICON

function tipForClub(club: ClubWithDistance): string {
  return club.distanceKm != null
    ? `${club.club_name} · ${club.distanceKm < 10 ? club.distanceKm.toFixed(1) : Math.round(club.distanceKm)} km`
    : club.club_name
}

export interface MyLocation {
  lat: number
  lng: number
}

interface MapViewProps {
  clubs: ClubWithDistance[]
  selectedClubId: string | null
  onSelectClub: (clubId: string) => void
  focusPoint: PlaceFocus | null
  focusClub: ClubWithDistance | null
  /** Standing GPS position (survives place-session clear). */
  myLocation?: MyLocation | null
  /** Bump to briefly emphasize the me marker (Near Me). */
  mePulseKey?: number
  /** Bump to pan/fly to myLocation without changing search/place session. */
  recenterKey?: number
  radiusKm?: number | null
  /** Debounced map center/zoom for browse-nearby mode. */
  onViewChange?: (view: MapViewState) => void
  trackView?: boolean
  /**
   * When true, fit the camera to the current marker set (club-name search only).
   * Must stay false during map browse so list updates never steal zoom/pan.
   */
  autoFitResults?: boolean
}

function MapViewComponent({
  clubs,
  selectedClubId,
  onSelectClub,
  focusPoint,
  focusClub,
  myLocation = null,
  mePulseKey = 0,
  recenterKey = 0,
  radiusKm = null,
  onViewChange,
  trackView = false,
  autoFitResults = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const focusLayerRef = useRef<L.LayerGroup | null>(null)
  const meLayerRef = useRef<L.LayerGroup | null>(null)
  const meMarkerRef = useRef<L.Marker | null>(null)
  const markersById = useRef(new Map<string, L.Marker>())
  const lastFocusKey = useRef<string>('')
  const lastMarkersKey = useRef<string>('')
  const lastClubFlyId = useRef<string>('')
  const lastResultFitKey = useRef('')
  const lastRecenterKey = useRef(0)
  const lastPulseKey = useRef(0)
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

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(SOUTH_ASIA_CENTER, SOUTH_ASIA_ZOOM)

    L.control.zoom({ position: 'topright' }).addTo(map)

    const basemaps = getAvailableBasemaps()
    const baseLayers: Record<string, L.Layer> = {}
    let isFirst = true
    const layerObjects: L.TileLayer.IndiaBoundaryCorrected[] = []

    for (const [name, tiles] of Object.entries(basemaps)) {
      const layer = L.tileLayer.indiaBoundaryCorrected(tiles.url, {
        attribution: tiles.attribution,
        maxZoom: tiles.maxZoom,
        maxNativeZoom: tiles.maxNativeZoom,
        subdomains: tiles.subdomains ?? 'abc',
        layerConfig: tiles.layerConfig ?? 'cartodb-light',
        pmtilesUrl: '/data/india_boundary_corrections.pmtiles',
        keepBuffer: 4,
        updateWhenIdle: true,
      })
      baseLayers[name] = layer
      layerObjects.push(layer)

      if (isFirst) {
        layer.addTo(map)
        isFirst = false
      }
    }

    if (Object.keys(baseLayers).length > 1) {
      L.control.layers(baseLayers, undefined, { position: 'bottomright' }).addTo(map)
    }

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
      animate: false,
    })
    map.addLayer(cluster)

    const focusLayer = L.layerGroup().addTo(map)
    const meLayer = L.layerGroup().addTo(map)

    mapRef.current = map
    clusterRef.current = cluster
    focusLayerRef.current = focusLayer
    meLayerRef.current = meLayer

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false })
    })
    observer.observe(containerRef.current)

    // Container may not have final size on first paint (lazy MapView / sheet layout).
    requestAnimationFrame(() => {
      map.invalidateSize({ animate: false })
    })

    // The boundary corrector uses PMTiles which loads metadata asynchronously.
    // Force a redraw exactly when the metadata finishes loading.
    let isMounted = true
    
    layerObjects.forEach(layer => {
      if ('getTileFixer' in layer) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fixer = (layer as any).getTileFixer()
        if (fixer) {
          fixer.getSource().getHeader()
            .then(() => {
              if (isMounted) layer.redraw()
            })
            .catch((err: Error) => {
              console.warn('Boundary corrector metadata failed to load:', err)
            })
        }
      }
    })

    const markers = markersById.current
    return () => {
      isMounted = false
      observer.disconnect()
      map.remove()
      mapRef.current = null
      clusterRef.current = null
      focusLayerRef.current = null
      meLayerRef.current = null
      meMarkerRef.current = null
      markers.clear()
      // Strict Mode remounts the map with a fresh cluster; without resetting these
      // keys the marker effect thinks the set is unchanged and leaves the map empty
      // until a zoom/browse change rewrites markersKey.
      lastMarkersKey.current = ''
      lastFocusKey.current = ''
      lastClubFlyId.current = ''
      lastResultFitKey.current = ''
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

  const displayClubs = clubs

  // Markers: rebuild only when membership changes (order-independent key avoids sort flicker).
  const markersKey = displayClubs
    .map((c) => c.club_id)
    .slice()
    .sort()
    .join('|')
  useEffect(() => {
    const cluster = clusterRef.current
    const map = mapRef.current
    if (!cluster || !map) return
    if (markersKey === lastMarkersKey.current) {
      return
    }
    lastMarkersKey.current = markersKey

    const nextIds = new Set(
      displayClubs
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((c) => c.club_id),
    )

    // Batch removals then additions: using Leaflet's bulk APIs avoids the
    // partial-redraw flash that occurs when many individual removeLayer/addLayer
    // calls trigger intermediate cluster refreshes.
    const toRemove: L.Marker[] = []
    for (const [id, marker] of [...markersById.current]) {
      if (nextIds.has(id)) continue
      toRemove.push(marker)
      markersById.current.delete(id)
    }
    if (toRemove.length) cluster.removeLayers(toRemove)

    const toAdd: L.Marker[] = []
    for (const club of displayClubs) {
      if (club.latitude == null || club.longitude == null) continue
      if (markersById.current.has(club.club_id)) continue
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
      toAdd.push(marker)
    }
    if (toAdd.length) cluster.addLayers(toAdd)
    cluster.refreshClusters()
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
        className: selected
          ? 'club-tooltip club-tooltip--selected'
          : 'club-tooltip',
      })
      if (selected) marker.openTooltip()
      else marker.closeTooltip()
    }
  }, [selectedClubId, markersKey, displayClubs, focusClub])

  // Standing "my location" marker (independent of placeFocus session)
  useEffect(() => {
    const meLayer = meLayerRef.current
    if (!meLayer) return

    if (!myLocation) {
      meLayer.clearLayers()
      meMarkerRef.current = null
      return
    }

    const latlng: L.LatLngExpression = [myLocation.lat, myLocation.lng]
    if (meMarkerRef.current) {
      meMarkerRef.current.setLatLng(latlng)
      return
    }

    const marker = L.marker(latlng, {
      icon: meIcon(false),
      interactive: false,
      keyboard: false,
      zIndexOffset: 800,
    })
    marker.bindTooltip('You are here', {
      direction: 'top',
      offset: [0, -10],
      className: 'me-tooltip',
    })
    meMarkerRef.current = marker
    meLayer.addLayer(marker)
  }, [myLocation])

  // Brief emphasize on Near Me
  useEffect(() => {
    if (!mePulseKey || mePulseKey === lastPulseKey.current) return
    lastPulseKey.current = mePulseKey
    const marker = meMarkerRef.current
    if (!marker) return
    marker.setIcon(meIcon(true))
    const timer = window.setTimeout(() => {
      if (meMarkerRef.current === marker) marker.setIcon(meIcon(false))
    }, 1400)
    return () => window.clearTimeout(timer)
  }, [mePulseKey])

  // Recenter camera on me only (no place session / list change)
  useEffect(() => {
    if (!recenterKey || recenterKey === lastRecenterKey.current) return
    lastRecenterKey.current = recenterKey
    const map = mapRef.current
    if (!map || !myLocation) return
    beginFlight(650)
    const targetZoom = Math.min(16, Math.max(map.getZoom(), 13))
    map.flyTo([myLocation.lat, myLocation.lng], targetZoom, { duration: 0.45 })
  }, [recenterKey, myLocation])

  // Place / locate session pin + radius + single fly
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

    // User locate: me marker lives on meLayer; only draw radius here.
    if (focusPoint.source !== 'user') {
      L.circleMarker([focusPoint.lat, focusPoint.lng], {
        radius: 8,
        color: '#9b1249',
        weight: 2,
        fillColor: '#d41b69',
        fillOpacity: 0.95,
      })
        .bindTooltip(focusPoint.label, { direction: 'top', permanent: false })
        .addTo(focusLayer)
    }

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

    // Soft Near Me re-tap: already looking at me → no jarring re-fly
    if (focusPoint.source === 'user') {
      const c = map.getCenter()
      const near =
        haversineKm(c.lat, c.lng, focusPoint.lat, focusPoint.lng) < 1.6
      if (near && map.getZoom() >= 11) return
    }

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
    map.flyTo(
      [focusClub.latitude, focusClub.longitude],
      Math.max(map.getZoom(), 13),
      { duration: 0.45 },
    )
  }, [focusClub])

  // Intentional club-name search only: never auto-fit during map browse
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

  return (
    <div ref={containerRef} className="map-view" aria-label="Rotaract clubs map" />
  )
}

export const MapView = memo(MapViewComponent)
