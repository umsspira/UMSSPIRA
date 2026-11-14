// Zoom del visor de respaldos (HU-21, T21.7): de 50 % a 300 %, en pasos de 25 %
export const MIN_ZOOM_PERCENT = 50;
export const MAX_ZOOM_PERCENT = 300;
export const ZOOM_STEP_PERCENT = 25;
export const DEFAULT_ZOOM_PERCENT = 100;

export function zoomIn(current: number): number {
  return Math.min(current + ZOOM_STEP_PERCENT, MAX_ZOOM_PERCENT);
}

export function zoomOut(current: number): number {
  return Math.max(current - ZOOM_STEP_PERCENT, MIN_ZOOM_PERCENT);
}
