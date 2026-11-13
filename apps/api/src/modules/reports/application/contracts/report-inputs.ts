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
  status: 'ok' | 'insufficient' | 'no-data';
  percentage?: number;
  graduateCount?: number;
}

export interface CompetencyHeatmap {
  areas: Array<{ id: string; name: string }>;
  cohorts: string[];
  cells: CompetencyHeatmapCell[];
  updatedAt: Date | null;
}

export interface ReportFile {
  bytes: Buffer;
  name: string;
  mime: string;
}
