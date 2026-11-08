/**
 * Esri-tuned India boundary LayerConfigs.
 *
 * Built-in package IDs (osm-carto, cartodb-*) match OSM/Carto palettes only.
 * Esri World Street / Gray Canvas need their own paint colors and URL templates.
 */
import {
  LayerConfig,
  layerConfigs,
} from '@india-boundary-corrector/leaflet-layer'

export const PMTILES_URL = '/data/india_boundary_corrections.pmtiles'

export const ESRI_STREET_LAYER_CONFIG_ID = 'esri-world-street'
export const ESRI_LIGHT_GRAY_LAYER_CONFIG_ID = 'esri-light-gray'
export const ESRI_DARK_GRAY_LAYER_CONFIG_ID = 'esri-dark-gray'

const ESRI_STREET_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
const ESRI_LIGHT_GRAY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
const ESRI_DARK_GRAY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'

/** Soft gray-violet that reads as an admin border on Esri Street. */
const STREET_BORDER = 'rgb(150, 138, 150)'
const STREET_BORDER_DASH = 'rgb(120, 108, 120)'

/** Soft gray matching Light Gray Canvas administrative lines. */
const LIGHT_BORDER = 'rgb(152, 152, 152)'

/**
 * Lighter than Esri Dark Gray canvas (~rgb(65-75)) so redrawn borders stay visible.
 */
const DARK_BORDER = 'rgb(145, 145, 148)'

export function ensureIndiaBoundaryLayerConfigs(): void {
  // Replace on each ensure so HMR / reloads pick up paint tweaks.
  for (const id of [
    ESRI_STREET_LAYER_CONFIG_ID,
    ESRI_LIGHT_GRAY_LAYER_CONFIG_ID,
    ESRI_DARK_GRAY_LAYER_CONFIG_ID,
  ]) {
    if (layerConfigs.get(id)) layerConfigs.remove(id)
  }

  {
    layerConfigs.register(
      new LayerConfig({
        id: ESRI_STREET_LAYER_CONFIG_ID,
        tileUrlTemplates: [ESRI_STREET_URL],
        lineWidthStops: { 3: 0.8, 5: 1.2, 8: 1.8, 10: 2.4, 14: 3 },
        lineStyles: [
          {
            color: STREET_BORDER,
            layerSuffix: 'ne',
            endZoom: 4,
            lineExtensionFactor: 0.2,
            delWidthFactor: 3.2,
          },
          {
            color: STREET_BORDER,
            layerSuffix: 'ne-disp',
            endZoom: 4,
            delWidthFactor: 0,
          },
          {
            color: STREET_BORDER,
            layerSuffix: 'ne-internal',
            startZoom: 4,
            endZoom: 4,
            widthFraction: 0.45,
            dashArray: [2, 2],
            delWidthFactor: 3.2,
          },
          // Wide soft stroke helps cover residual basemap ink after delete blur.
          {
            color: STREET_BORDER,
            layerSuffix: 'osm',
            alpha: 0.12,
            startZoom: 5,
            lineWidthStops: { 5: 8, 10: 7, 14: 7 },
            lineExtensionFactor: 0.2,
            delWidthFactor: 3,
          },
          {
            color: STREET_BORDER,
            layerSuffix: 'osm',
            startZoom: 5,
            lineExtensionFactor: 0.2,
            delWidthFactor: 3,
          },
          {
            color: STREET_BORDER_DASH,
            layerSuffix: 'osm',
            startZoom: 5,
            widthFraction: 0.35,
            dashArray: [28, 2, 8, 2],
            delWidthFactor: 0,
          },
          {
            color: STREET_BORDER,
            layerSuffix: 'osm-disp',
            startZoom: 5,
            delWidthFactor: 0,
          },
          {
            color: STREET_BORDER,
            layerSuffix: 'osm-internal',
            startZoom: 5,
            widthFraction: 0.45,
            dashArray: [2, 2],
            delWidthFactor: 3,
          },
        ],
      }),
    )
  }

  {
    layerConfigs.register(
      new LayerConfig({
        id: ESRI_LIGHT_GRAY_LAYER_CONFIG_ID,
        tileUrlTemplates: [ESRI_LIGHT_GRAY_URL],
        lineWidthStops: { 1: 0.6, 4: 1, 7: 1.6, 12: 2.2, 16: 2.6 },
        lineStyles: [
          {
            color: LIGHT_BORDER,
            layerSuffix: 'ne',
            endZoom: 4,
            lineExtensionFactor: 0.1,
            delWidthFactor: 3.2,
          },
          {
            color: LIGHT_BORDER,
            layerSuffix: 'ne-disp',
            endZoom: 4,
            delWidthFactor: 0,
          },
          {
            color: LIGHT_BORDER,
            layerSuffix: 'ne-internal',
            startZoom: 4,
            endZoom: 4,
            widthFraction: 0.5,
            dashArray: [2, 2],
            delWidthFactor: 3.2,
          },
          {
            color: LIGHT_BORDER,
            layerSuffix: 'osm',
            alpha: 0.12,
            startZoom: 5,
            lineWidthStops: { 5: 8, 10: 7, 14: 7 },
            lineExtensionFactor: 0.15,
            delWidthFactor: 3,
          },
          {
            color: LIGHT_BORDER,
            layerSuffix: 'osm',
            startZoom: 5,
            lineExtensionFactor: 0.15,
            delWidthFactor: 3,
          },
          {
            color: LIGHT_BORDER,
            layerSuffix: 'osm-disp',
            startZoom: 5,
            delWidthFactor: 0,
          },
          {
            color: LIGHT_BORDER,
            layerSuffix: 'osm-internal',
            startZoom: 5,
            widthFraction: 0.5,
            dashArray: [2, 2],
            delWidthFactor: 3,
          },

        ],
      }),
    )
  }

  {
    layerConfigs.register(
      new LayerConfig({
        id: ESRI_DARK_GRAY_LAYER_CONFIG_ID,
        tileUrlTemplates: [ESRI_DARK_GRAY_URL],
        lineWidthStops: { 0: 1, 3: 1.2, 8: 1.8, 12: 2.2 },
        lineStyles: [
          {
            color: DARK_BORDER,
            layerSuffix: 'ne',
            endZoom: 4,
            delWidthFactor: 2,
          },
          {
            color: DARK_BORDER,
            layerSuffix: 'ne-disp',
            endZoom: 4,
            delWidthFactor: 0,
          },
          {
            color: DARK_BORDER,
            layerSuffix: 'ne-internal',
            startZoom: 4,
            endZoom: 4,
            widthFraction: 0.35,
            dashArray: [2, 2],
            delWidthFactor: 2.5,
          },
          {
            color: DARK_BORDER,
            layerSuffix: 'osm',
            startZoom: 5,
            delWidthFactor: 2,
          },
          {
            color: DARK_BORDER,
            layerSuffix: 'osm-disp',
            startZoom: 5,
            delWidthFactor: 0,
          },
          {
            color: DARK_BORDER,
            layerSuffix: 'osm-internal',
            startZoom: 5,
            widthFraction: 0.35,
            dashArray: [2, 2],
            delWidthFactor: 2,
          },
        ],
      }),
    )
  }
}

/** Known production layerConfig IDs (Esri-tuned + package built-ins for env overrides). */
export function isKnownLayerConfigId(id: string): boolean {
  ensureIndiaBoundaryLayerConfigs()
  return layerConfigs.getAvailableIds().includes(id)
}
