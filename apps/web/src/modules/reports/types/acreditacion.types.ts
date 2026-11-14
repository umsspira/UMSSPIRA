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
}