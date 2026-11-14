import type { CohortEmployabilityData } from '../accreditation/components/cohort-employability-chart';

export interface SalaryRangeCount {
  range: string;
  count: number;
}

export interface AccreditationIndicators {
  totalResponses: number;
  employedGraduates: number;
  employedPercent: number;
  averageInsertionMonths: number | null;
  salaryRanges: SalaryRangeCount[];
  /** Gráfico «Empleabilidad por cohorte» (HU-001 CA-03 y CA-04). */
  cohorts: CohortEmployabilityData[];
  /** Opciones de los filtros con datos, sin aplicar el filtro (HU-003 CA-01 y CA-02, T3.1). */
  availableCohorts: string[];
  availableSemesters: string[];
}