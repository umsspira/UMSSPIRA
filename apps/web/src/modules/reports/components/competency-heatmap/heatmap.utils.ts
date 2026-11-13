import {
  AFFINITY_AREAS,
  AFFINITY_AREA_LABELS,
  type AffinityArea,
} from '@umsspira/shared-types';
import type { HeatmapCell, HeatmapCohort } from './heatmap.types';

/** Cinco tramos disjuntos: [0,20), [20,40), [40,60), [60,80), [80,100]. */
export const HEATMAP_PALETTE = [
  '#FFF0D9',
  '#FFD09B',
  '#FFAD61',
  '#E28E49',
  '#B65D2B',
] as const;

export const HEATMAP_NO_DATA = '#E9E7E3';
export const HEATMAP_INSUFFICIENT = '#FBF8F3';
export const HEATMAP_AREAS: readonly AffinityArea[] = AFFINITY_AREAS;
export const HEATMAP_AREA_LABELS = AFFINITY_AREA_LABELS;

export function percentageBand(value: number): 0 | 1 | 2 | 3 | 4 {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError('El porcentaje del mapa debe estar entre 0 y 100.');
  }
  return Math.min(Math.floor(value / 20), 4) as 0 | 1 | 2 | 3 | 4;
}

export function percentageColor(value: number): string {
  return HEATMAP_PALETTE[percentageBand(value)];
}

/**
 * Protección adicional de la PRESENTACIÓN: aunque un adaptador cometa un error,
 * nunca se dibujan porcentajes ni cantidades para muestras de 1 a 4.
 * El backend DEBE cumplir independientemente CA-06 y CA-09.
 */
export function safeCell(cell: HeatmapCell): HeatmapCell {
  if (cell.status !== 'calculated') return cell;
  if (!Number.isInteger(cell.graduateCount) || cell.graduateCount < 0) {
    throw new RangeError('Tamaño de muestra inválido.');
  }
  if (cell.graduateCount === 0) return { status: 'no-data' };
  if (cell.graduateCount < 5) return { status: 'insufficient' };
  percentageBand(cell.percentage);
  return cell;
}

export function orderedCohorts(cohorts: readonly HeatmapCohort[]): HeatmapCohort[] {
  return [...cohorts].sort((a, b) => a.year - b.year);
}

/** Fecha mostrada en horario boliviano; no inventar una fecha cuando falta. */
export function formatHeatmapUpdatedAt(value: string | null | undefined): string {
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`;
}

export function formatHeatmapPercentage(value: number): string {
  return `${new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 }).format(value)} %`;
}
