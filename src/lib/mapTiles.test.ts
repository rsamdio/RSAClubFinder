import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAvailableBasemaps,
  ESRI_LIGHT_GRAY_TILES,
  ESRI_STREET_TILES,
  ESRI_DARK_GRAY_TILES,
} from './mapTiles'
import {
  ESRI_STREET_LAYER_CONFIG_ID,
  ESRI_LIGHT_GRAY_LAYER_CONFIG_ID,
  ESRI_DARK_GRAY_LAYER_CONFIG_ID,
} from './indiaBoundaryLayerConfigs'

describe('getAvailableBasemaps', () => {
  beforeEach(() => {
    vi.resetModules()
    import.meta.env.VITE_MAP_TILE_URL = ''
    import.meta.env.VITE_MAP_TILE_ATTRIBUTION = ''
    import.meta.env.VITE_MAP_TILE_LAYER_CONFIG = ''
  })

  it('returns curated Esri basemaps only', () => {
    const basemaps = getAvailableBasemaps()
    expect(Object.keys(basemaps)).toHaveLength(3)

    expect(basemaps['Street Map (Default)']).toBe(ESRI_STREET_TILES)
    expect(basemaps['Light Gray']).toBe(ESRI_LIGHT_GRAY_TILES)
    expect(basemaps['Dark Mode']).toBe(ESRI_DARK_GRAY_TILES)
    expect(basemaps['Standard OSM (Local Lang)']).toBeUndefined()

    expect(ESRI_STREET_TILES.layerConfig).toBe(ESRI_STREET_LAYER_CONFIG_ID)
    expect(ESRI_LIGHT_GRAY_TILES.layerConfig).toBe(
      ESRI_LIGHT_GRAY_LAYER_CONFIG_ID,
    )
    expect(ESRI_DARK_GRAY_TILES.layerConfig).toBe(ESRI_DARK_GRAY_LAYER_CONFIG_ID)
  })

  it('respects VITE_MAP_TILE_URL overrides and returns only custom basemap', () => {
    import.meta.env.VITE_MAP_TILE_URL = 'https://example.com/{z}/{x}/{y}.png'
    const basemaps = getAvailableBasemaps()

    expect(Object.keys(basemaps)).toHaveLength(1)
    const custom = basemaps['Custom Basemap']

    expect(custom.url).toBe('https://example.com/{z}/{x}/{y}.png')
    expect(custom.attribution).toBe(ESRI_STREET_TILES.attribution)
    expect(custom.layerConfig).toBe(ESRI_STREET_LAYER_CONFIG_ID)
  })

  it('respects complete environment overrides', () => {
    import.meta.env.VITE_MAP_TILE_URL = 'https://custom.com/{z}/{x}/{y}.png'
    import.meta.env.VITE_MAP_TILE_ATTRIBUTION = 'Custom Attribution'
    import.meta.env.VITE_MAP_TILE_LAYER_CONFIG = 'custom-layer'

    const basemaps = getAvailableBasemaps()
    const custom = basemaps['Custom Basemap']

    expect(custom.url).toBe('https://custom.com/{z}/{x}/{y}.png')
    expect(custom.attribution).toBe('Custom Attribution')
    expect(custom.layerConfig).toBe('custom-layer')
  })
})
