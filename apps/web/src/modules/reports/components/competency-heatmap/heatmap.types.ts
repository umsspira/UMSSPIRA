import type { AffinityArea } from '@umsspira/shared-types';

/**
 * Contrato INTERNO de presentación para HU-EP09-06.
 * Independiente del contrato JSON HTTP de T2.1.
 */
export type HeatmapCell =
  | { status: 'calculated'; percentage: number; graduateCount: number }
  | { status: 'no-data' }
  | { status: 'insufficient' };

export interface HeatmapCohort {
  year: number;
  /** Siempre las seis claves de AFFINITY_AREAS. Nunca inventar 0 para datos ausentes. */
  areas: Record<AffinityArea, HeatmapCell>;
}

export interface HeatmapData {
  /** Instante real del último cálculo/actualización, ISO-8601 con zona horaria. */
  /** Null cuando todavía no existe un cálculo para esta carrera. */
  updatedAt: string | null;
  cohorts: HeatmapCohort[];
}

/** Inyectable: desacopla la presentación del transporte y contrato HTTP. */
export type HeatmapLoader = (signal: AbortSignal) => Promise<HeatmapData>;
