import type {
  DashboardMetrics,
  GraduateReportPage,
  GraduateReportRecord,
} from '../../domain/entities/graduate-report';
import type {
  CompetencyHeatmap,
  GraduateListQuery,
  ReportFilter,
} from '../contracts/report-inputs';

import type { AccreditationDashboard } from '../contracts/accreditation-dashboard';
import type { AccreditationFilter } from '../contracts/accreditation-filters';

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface ReportRepository {
  /** El filtro es opcional: cohorte y semestre de la HU-003 (el semestre no aplica al mapa). */
  accreditationDashboard(
    careerIds: readonly string[],
    filter?: AccreditationFilter,
  ): Promise<AccreditationDashboard>;
  metrics(careerIds: readonly string[]): Promise<DashboardMetrics>;
  competencyHeatmap(
    careerIds: readonly string[],
    filter?: AccreditationFilter,
  ): Promise<CompetencyHeatmap>;
  list(careerIds: readonly string[], query: GraduateListQuery): Promise<GraduateReportPage>;
  exportData(
    careerIds: readonly string[],
    filter: ReportFilter,
  ): Promise<{ records: GraduateReportRecord[]; careerNames: string[] }>;
}
