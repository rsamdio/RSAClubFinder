/** Idle map hard-cap - browse/place lists stay ~15 in FinderApp. */
export const IDLE_MAP_MARKER_CAP = 300

export interface MapViewState {
  lat: number
  lng: number
  zoom: number
}
