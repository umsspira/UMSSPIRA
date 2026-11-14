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
}