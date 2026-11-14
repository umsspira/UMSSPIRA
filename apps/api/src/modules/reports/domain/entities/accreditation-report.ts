/**
 * Sprint 3 (US-3.3): datos del tablero de acreditación. Los usan el tablero (HU-001), el mapa de calor (HU-002),
 * los filtros (HU-003) y las exportaciones a PDF y Excel (HU-004).
 */

/** Cohortes o celdas con menos respuestas que este mínimo muestran «Sin datos suficientes». */
export const MIN_RESPONSES_PER_GROUP = 5;

export interface AccreditationPeriod {
  /** Cohorte elegida en el filtro; null cuando se consultan todas. */
  cohort: number | null;
  /** Semestre elegido en el filtro con el formato 2/2026; null cuando se consultan todos. */
  semester: string | null;
}

export interface AccreditationIndicators {
  totalResponses: number;
  /** Porcentaje de titulados empleados sobre el total de respuestas, redondeado a entero. */
  employedPercent: number;
  /** Promedio en meses de los que trabajan; null si nadie trabaja. */
  averageInsertionMonths: number | null;
}

export interface SalaryRangeCount {
  range: string;
  count: number;
}

export interface CohortEmployability {
  cohort: number;
  /** null cuando la cohorte tiene de 1 a 4 respuestas: la cantidad no se muestra. */
  responses: number | null;
  /** null cuando la cohorte tiene de 1 a 4 respuestas. */
  employedPercent: number | null;
}

/** Celda del mapa: con porcentaje, sin cálculos o calculada con 1 a 4 titulados (sin porcentaje ni cantidad). */
export type HeatmapCell =
  | { kind: 'value'; percent: number; graduates: number }
  | { kind: 'no-data' }
  | { kind: 'insufficient' };

export interface HeatmapRow {
  cohort: number;
  cells: HeatmapCell[];
}

export interface AccreditationHeatmap {
  areas: string[];
  rows: HeatmapRow[];
  updatedAt: Date | null;
}

export interface AccreditationReport {
  careerNames: string[];
  period: AccreditationPeriod;
  generatedAt: Date;
  indicators: AccreditationIndicators;
  salaryRanges: SalaryRangeCount[];
  cohorts: CohortEmployability[];
  heatmap: AccreditationHeatmap;
}
