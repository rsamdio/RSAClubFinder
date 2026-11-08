import { describe, it, expect, beforeAll } from 'vitest'
import { layerConfigs } from '@india-boundary-corrector/leaflet-layer'
import {
  ensureIndiaBoundaryLayerConfigs,
  ESRI_STREET_LAYER_CONFIG_ID,
  ESRI_LIGHT_GRAY_LAYER_CONFIG_ID,
  ESRI_DARK_GRAY_LAYER_CONFIG_ID,
  isKnownLayerConfigId,
} from './indiaBoundaryLayerConfigs'
import {
  ESRI_STREET_TILES,
  ESRI_LIGHT_GRAY_TILES,
  ESRI_DARK_GRAY_TILES,
  getAvailableBasemaps,
} from './mapTiles'

describe('indiaBoundaryLayerConfigs', () => {
  beforeAll(() => {
    ensureIndiaBoundaryLayerConfigs()
  })

  it('registers Esri-tuned configs with Esri tile templates', () => {
    for (const id of [
      ESRI_STREET_LAYER_CONFIG_ID,
      ESRI_LIGHT_GRAY_LAYER_CONFIG_ID,
      ESRI_DARK_GRAY_LAYER_CONFIG_ID,
    ]) {
      expect(layerConfigs.get(id)?.id).toBe(id)
      expect(isKnownLayerConfigId(id)).toBe(true)
    }

    expect(
      layerConfigs.detectFromTemplates([ESRI_STREET_TILES.url])?.id,
    ).toBe(ESRI_STREET_LAYER_CONFIG_ID)
    expect(
      layerConfigs.detectFromTemplates([ESRI_LIGHT_GRAY_TILES.url])?.id,
    ).toBe(ESRI_LIGHT_GRAY_LAYER_CONFIG_ID)
    expect(
      layerConfigs.detectFromTemplates([ESRI_DARK_GRAY_TILES.url])?.id,
    ).toBe(ESRI_DARK_GRAY_LAYER_CONFIG_ID)
  })

  it('keeps Esri URL axis order as z/y/x', () => {
    for (const tiles of [
      ESRI_STREET_TILES,
      ESRI_LIGHT_GRAY_TILES,
      ESRI_DARK_GRAY_TILES,
    ]) {
      expect(tiles.url).toContain('/tile/{z}/{y}/{x}')
      expect(tiles.url).not.toContain('/{z}/{x}/{y}')
    }
  })

  it('wires production basemaps to Esri-tuned config ids only', () => {
    const basemaps = getAvailableBasemaps()
    expect(Object.keys(basemaps)).toEqual([
      'Street Map (Default)',
      'Light Gray',
      'Dark Mode',
    ])
    for (const tiles of Object.values(basemaps)) {
      expect(isKnownLayerConfigId(tiles.layerConfig)).toBe(true)
      expect(tiles.layerConfig.startsWith('esri-')).toBe(true)
    }
  })
})
