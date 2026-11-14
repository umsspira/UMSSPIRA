import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { RedisModule } from '../../shared/infrastructure/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { reportsProviders } from './infrastructure/providers/reports.providers';
import { ReportExportGuard } from './http/guards/report-export.guard';
import { GetReportMetricsController } from './http/controllers/get-report-metrics.controller';
import { ListReportGraduatesController } from './http/controllers/list-report-graduates.controller';
import { GetGraduateReportController } from './http/controllers/get-graduate-report.controller';
import { ExportReportCsvController } from './http/controllers/export-report-csv.controller';
import { ExportReportPdfController } from './http/controllers/export-report-pdf.controller';
import { GetCompetencyHeatmapController } from './http/controllers/get-competency-heatmap.controller';
import { GetAccreditationDashboardController } from './http/controllers/get-accreditation-dashboard.controller';
import { ExportAccreditationPdfController } from './http/controllers/export-accreditation-pdf.controller';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [
    GetReportMetricsController,
    ListReportGraduatesController,
    GetGraduateReportController,
    ExportReportCsvController,
    ExportReportPdfController,
    GetCompetencyHeatmapController,
    GetAccreditationDashboardController,
    ExportAccreditationPdfController,
  ],
  providers: [...reportsProviders, ReportExportGuard],
})
export class ReportsModule {}
