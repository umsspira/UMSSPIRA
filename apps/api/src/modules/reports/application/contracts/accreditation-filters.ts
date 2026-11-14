/** Filtros del tablero de acreditación (HU-003). Los comparten el tablero, el mapa y las exportaciones. */
export interface AccreditationFilter {
  careerId?: string;
  cohort?: number;
  /** Semestre con el formato 2/2026. */
  semester?: string;
}
