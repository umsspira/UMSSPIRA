import type { Provider } from '@nestjs/common';
import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../application/ports/report-repository.port';
import {
  REPORT_CSV_WRITER,
  REPORT_PDF_WRITER,
  type ReportWriter,
} from '../../application/ports/report-writer.port';
import { PrismaReportRepository } from '../repositories/prisma-report.repository';
import { CsvReportWriter } from '../exporters/csv-report.writer';
import { PdfReportWriter } from '../exporters/pdf-report.writer';
import { GetReportMetricsUseCase } from '../../application/use-cases/get-report-metrics.use-case';
import { ListReportGraduatesUseCase } from '../../application/use-cases/list-report-graduates.use-case';
import { GetGraduateReportUseCase } from '../../application/use-cases/get-graduate-report.use-case';
import { ExportReportCsvUseCase } from '../../application/use-cases/export-report-csv.use-case';
import { ExportReportPdfUseCase } from '../../application/use-cases/export-report-pdf.use-case';
import { GetCompetencyHeatmapUseCase } from '../../application/use-cases/get-competency-heatmap.use-case';
import { GetAccreditationDashboardUseCase } from '../../application/use-cases/get-accreditation-dashboard.use-case';
import { ExportAccreditationPdfUseCase } from '../../application/use-cases/export-accreditation-pdf.use-case';
import {
  ACCREDITATION_PDF_WRITER,
  ACCREDITATION_REPORT_READER,
  type AccreditationReportReader,
  type AccreditationReportWriter,
} from '../../application/ports/accreditation-report.port';
import {
  ACCREDITATION_CACHE,
  type AccreditationCachePort,
} from '../../application/ports/accreditation-cache.port';
import { AccreditationReportDataReader } from '../repositories/accreditation-report.reader';
import { AccreditationPdfWriter } from '../exporters/accreditation-pdf.writer';

export const reportsProviders: Provider[] = [
  PrismaReportRepository,
  { provide: REPORT_REPOSITORY, useExisting: PrismaReportRepository },
  { provide: REPORT_CSV_WRITER, useClass: CsvReportWriter },
  { provide: REPORT_PDF_WRITER, useClass: PdfReportWriter },
  {
    provide: GetReportMetricsUseCase,
    inject: [REPORT_REPOSITORY],
    useFactory: (repository: ReportRepository) => new GetReportMetricsUseCase(repository),
  },
  {
    provide: ListReportGraduatesUseCase,
    inject: [REPORT_REPOSITORY],
    useFactory: (repository: ReportRepository) => new ListReportGraduatesUseCase(repository),
  },
  {
    provide: GetGraduateReportUseCase,
    inject: [REPORT_REPOSITORY],
    useFactory: (repository: ReportRepository) => new GetGraduateReportUseCase(repository),
  },
  {
    provide: ExportReportCsvUseCase,
    inject: [GetGraduateReportUseCase, REPORT_CSV_WRITER],
    useFactory: (reader: GetGraduateReportUseCase, writer: ReportWriter) =>
      new ExportReportCsvUseCase(reader, writer),
  },
  {
    provide: ExportReportPdfUseCase,
    inject: [GetGraduateReportUseCase, REPORT_PDF_WRITER],
    useFactory: (reader: GetGraduateReportUseCase, writer: ReportWriter) =>
      new ExportReportPdfUseCase(reader, writer),
  },
  {
    provide: GetCompetencyHeatmapUseCase,
    inject: [REPORT_REPOSITORY],
    useFactory: (repository: ReportRepository) => new GetCompetencyHeatmapUseCase(repository),
  },
  {
    provide: GetAccreditationDashboardUseCase,
    inject: [REPORT_REPOSITORY, ACCREDITATION_CACHE],
    useFactory: (repository: ReportRepository, cache: AccreditationCachePort) =>
      new GetAccreditationDashboardUseCase(repository, cache),
  },
  { provide: ACCREDITATION_REPORT_READER, useClass: AccreditationReportDataReader },
  { provide: ACCREDITATION_PDF_WRITER, useClass: AccreditationPdfWriter },
  {
    provide: ExportAccreditationPdfUseCase,
    inject: [ACCREDITATION_REPORT_READER, ACCREDITATION_PDF_WRITER],
    useFactory: (reader: AccreditationReportReader, writer: AccreditationReportWriter) =>
      new ExportAccreditationPdfUseCase(reader, writer),
  },
];
