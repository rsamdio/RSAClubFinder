import {
  ESRI_DARK_GRAY_LAYER_CONFIG_ID,
  ESRI_LIGHT_GRAY_LAYER_CONFIG_ID,
  ESRI_STREET_LAYER_CONFIG_ID,
} from './indiaBoundaryLayerConfigs'

export interface TileConfig {
  url: string
  attribution: string
  maxZoom: number
  maxNativeZoom?: number
  subdomains?: string | string[]
  /** Must resolve in the India boundary layer-config registry. */
  layerConfig: string
}

/**
 * Free basemap: Esri Light Gray Canvas with India boundary corrections.
 * Zero-key default with English labels. Mapbox is used only for geocoding.
 */
export const ESRI_LIGHT_GRAY_TILES: TileConfig = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri - Esri, DeLorme, NAVTEQ',
  maxZoom: 19,
  maxNativeZoom: 16,
  layerConfig: ESRI_LIGHT_GRAY_LAYER_CONFIG_ID,
}

export const ESRI_STREET_TILES: TileConfig = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; Esri - Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
  maxZoom: 19,
  maxNativeZoom: 16,
  layerConfig: ESRI_STREET_LAYER_CONFIG_ID,
}

export const ESRI_DARK_GRAY_TILES: TileConfig = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri - Esri, DeLorme, NAVTEQ',
  maxZoom: 19,
  maxNativeZoom: 16,
  layerConfig: ESRI_DARK_GRAY_LAYER_CONFIG_ID,
}

export function getAvailableBasemaps(): Record<string, TileConfig> {
  const envUrl = import.meta.env.VITE_MAP_TILE_URL

  if (envUrl) {
    const layerConfig =
      import.meta.env.VITE_MAP_TILE_LAYER_CONFIG || ESRI_STREET_LAYER_CONFIG_ID
    return {
      'Custom Basemap': {
        url: envUrl,
        attribution:
          import.meta.env.VITE_MAP_TILE_ATTRIBUTION ||
          ESRI_STREET_TILES.attribution,
        maxZoom: 19,
        maxNativeZoom: 19,
        layerConfig,
      },
    }
  }

  return {
    'Street Map (Default)': ESRI_STREET_TILES,
    'Light Gray': ESRI_LIGHT_GRAY_TILES,
    'Dark Mode': ESRI_DARK_GRAY_TILES,
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
