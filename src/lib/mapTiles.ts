/** Configurable tile provider — swap without rewriting the app. */
export interface TileConfig {
  url: string
  attribution: string
  maxZoom: number
  subdomains?: string | string[]
}

/**
 * Free basemap: CARTO Positron on OpenStreetMap data.
 * Cost-conscious default for an NGO — Mapbox is used only for geocoding, not tiles.
 */
export const OSM_CARTO_TILES: TileConfig = {
  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 19,
  subdomains: 'abcd',
}

export function getTileConfig(): TileConfig {
  return OSM_CARTO_TILES
}

/** @deprecated use getTileConfig() / OSM_CARTO_TILES */
export const DEFAULT_TILES: TileConfig = OSM_CARTO_TILES

export const SOUTH_ASIA_CENTER: [number, number] = [22.5, 79]
export const SOUTH_ASIA_ZOOM = 5

/** Zoom at which map-center browse mode activates. */
export const MAP_BROWSE_MIN_ZOOM = 10
