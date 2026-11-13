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

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface ReportRepository {
  metrics(careerIds: readonly string[]): Promise<DashboardMetrics>;
  competencyHeatmap(careerIds: readonly string[]): Promise<CompetencyHeatmap>;
  list(careerIds: readonly string[], query: GraduateListQuery): Promise<GraduateReportPage>;
  exportData(
    careerIds: readonly string[],
    filter: ReportFilter,
  ): Promise<{ records: GraduateReportRecord[]; careerNames: string[] }>;
}
