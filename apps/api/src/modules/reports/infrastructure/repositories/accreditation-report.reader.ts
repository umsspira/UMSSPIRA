import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { AccreditationDashboard } from '../../application/contracts/accreditation-dashboard';
import type { AccreditationFilter } from '../../application/contracts/accreditation-filters';
import type { CompetencyHeatmap } from '../../application/contracts/report-inputs';
import type { AccreditationReportReader } from '../../application/ports/accreditation-report.port';
import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../application/ports/report-repository.port';
import type {
  AccreditationHeatmap,
  AccreditationReport,
  HeatmapCell,
} from '../../domain/entities/accreditation-report';

/**
 * HU-004: arma el reporte ejecutivo con los mismos datos que muestra el tablero:
 * los indicadores de la T1.1 y el mapa de calor de la T2.1, de las carreras permitidas.
 */
@Injectable()
export class AccreditationReportDataReader implements AccreditationReportReader {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly repository: ReportRepository,
    private readonly prisma: PrismaService,
  ) {}

  async read(
    careerIds: readonly string[],
    filter: AccreditationFilter,
  ): Promise<AccreditationReport> {
    const [dashboard, heatmap, careers] = await Promise.all([
      this.repository.accreditationDashboard(careerIds),
      this.repository.competencyHeatmap(careerIds),
      this.prisma.carrera.findMany({
        where: { id: { in: [...careerIds] } },
        select: { nombre: true },
        orderBy: { nombre: 'asc' },
      }),
    ]);
    return toAccreditationReport(
      dashboard,
      heatmap,
      careers.map((career) => career.nombre ?? 'Carrera sin nombre'),
      filter,
      new Date(),
    );
  }
}

export function toAccreditationReport(
  dashboard: AccreditationDashboard,
  heatmap: CompetencyHeatmap,
  careerNames: string[],
  filter: AccreditationFilter,
  generatedAt: Date,
): AccreditationReport {
  return {
    careerNames,
    period: { cohort: filter.cohort ?? null, semester: filter.semester ?? null },
    generatedAt,
    indicators: {
      totalResponses: dashboard.totalResponses,
      employedPercent: dashboard.employedPercentage,
      averageInsertionMonths: dashboard.averageInsertionMonths,
    },
    salaryRanges: Object.entries(dashboard.salaryRanges).map(([range, count]) => ({
      range,
      count,
    })),
    cohorts: dashboard.employabilityByCohort.map((item) => ({
      cohort: item.cohort,
      responses: item.status === 'ok' ? (item.totalResponses ?? null) : null,
      employedPercent: item.status === 'ok' ? (item.employedPercentage ?? null) : null,
    })),
    heatmap: toHeatmap(heatmap),
  };
}

function toHeatmap(heatmap: CompetencyHeatmap): AccreditationHeatmap {
  const cellByKey = new Map(heatmap.cells.map((cell) => [cell.cohort + ':' + cell.areaId, cell]));
  return {
    areas: heatmap.areas.map((area) => area.name),
    rows: heatmap.cohorts.map((cohort) => ({
      cohort: Number(cohort),
      cells: heatmap.areas.map((area): HeatmapCell => {
        const cell = cellByKey.get(cohort + ':' + area.id);
        if (cell?.status === 'ok' && cell.percentage !== undefined) {
          return { kind: 'value', percent: cell.percentage, graduates: cell.graduateCount ?? 0 };
        }
        return { kind: cell?.status === 'insufficient' ? 'insufficient' : 'no-data' };
      }),
    })),
    updatedAt: heatmap.updatedAt,
  };
}
