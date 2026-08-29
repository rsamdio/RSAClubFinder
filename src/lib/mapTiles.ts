export interface TileConfig {
  url: string
  attribution: string
  maxZoom: number
  maxNativeZoom?: number
  subdomains?: string | string[]
  layerConfig?: string
}

/**
 * Free basemap: Esri Light Gray Canvas with India boundary corrections.
 * Zero-key default with English labels. Mapbox is used only for geocoding.
 */
export const ESRI_LIGHT_GRAY_TILES: TileConfig = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; Esri - Esri, DeLorme, NAVTEQ',
  maxZoom: 19,
  maxNativeZoom: 16,
  layerConfig: 'cartodb-light',
}

export const ESRI_STREET_TILES: TileConfig = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri - Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
  maxZoom: 19,
  maxNativeZoom: 16,
  layerConfig: 'osm-carto',
}

export const OSM_STANDARD_TILES: TileConfig = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
  maxNativeZoom: 19,
  layerConfig: 'osm-carto',
}

export const ESRI_DARK_GRAY_TILES: TileConfig = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri - Esri, DeLorme, NAVTEQ',
  maxZoom: 19,
  maxNativeZoom: 16,
  layerConfig: 'cartodb-dark',
}

export function getAvailableBasemaps(): Record<string, TileConfig> {
  const envUrl = import.meta.env.VITE_MAP_TILE_URL

  if (envUrl) {
    return {
      'Custom Basemap': {
        url: envUrl,
        attribution:
          import.meta.env.VITE_MAP_TILE_ATTRIBUTION ||
          ESRI_LIGHT_GRAY_TILES.attribution,
        maxZoom: 19,
        maxNativeZoom: 19,
        layerConfig: import.meta.env.VITE_MAP_TILE_LAYER_CONFIG || 'cartodb-light',
      },
    }
  }

  return {
    'Street Map (Default)': ESRI_STREET_TILES,
    'Light Gray': ESRI_LIGHT_GRAY_TILES,
    'Dark Mode': ESRI_DARK_GRAY_TILES,
    'Standard OSM (Local Lang)': OSM_STANDARD_TILES,
  }
}

/** @deprecated use getAvailableBasemaps() */
export const OSM_CARTO_TILES: TileConfig = ESRI_STREET_TILES
/** @deprecated use getAvailableBasemaps() */
export const DEFAULT_TILES: TileConfig = ESRI_STREET_TILES

export const SOUTH_ASIA_CENTER: [number, number] = [22.5, 79]
export const SOUTH_ASIA_ZOOM = 5

/** Zoom at which map-center browse mode activates. */
export const MAP_BROWSE_MIN_ZOOM = 10
