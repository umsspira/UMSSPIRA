export const ACCREDITATION_SALARY_RANGES = [
  '0–2.999',
  '3.000–5.000',
  '5.001–8.000',
  '8.001–12.000',
  '12.001–21.000',
] as const;

export type AccreditationSalaryRange = (typeof ACCREDITATION_SALARY_RANGES)[number];

export interface AccreditationCohort {
  cohort: number;
  status: 'ok' | 'insufficient';
  /** Solo en cohortes con 5 respuestas o más (HU-001 CA-04). */
  totalResponses?: number;
  employedGraduates?: number;
  employedPercentage?: number;
}

export interface AccreditationDashboard {
  totalResponses: number;
  employedGraduates: number;
  employedPercentage: number;
  averageInsertionMonths: number | null;
  salaryRanges: Record<AccreditationSalaryRange, number>;
  employabilityByCohort: AccreditationCohort[];
}
