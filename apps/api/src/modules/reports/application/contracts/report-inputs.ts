import type { ReportStatus } from '../../domain/entities/graduate-report';

export interface ReportFilter {
  careerId?: string;
  status?: ReportStatus;
  search?: string;
}

export interface GraduateListQuery extends ReportFilter {
  page: number;
  limit: number;
}

export interface CompetencyHeatmapCell {
  cohort: string;
  areaId: string;
  areaName: string;
  percentage: number | null;
  graduateCount: number;
}

export interface CompetencyHeatmap {
  areas: Array<{ id: string; name: string }>;
  cohorts: string[];
  cells: CompetencyHeatmapCell[];
}

export interface ReportFile {
  bytes: Buffer;
  name: string;
  mime: string;
}
