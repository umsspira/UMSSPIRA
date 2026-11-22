import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { AccreditationFilter } from '../../application/contracts/accreditation-filters';
import { ExportAccreditationExcelUseCase } from '../../application/use-cases/export-accreditation-excel.use-case';
import { ReportExportGuard } from '../guards/report-export.guard';
import { accreditationFilterSchema } from '../schemas/reports.schemas';
/** HU-004: GET /reports/accreditation/xlsx con los filtros aplicados en el tablero. */
@Controller('reports')
@Roles('administrador')
export class ExportAccreditationExcelController {
  constructor(private readonly usecase: ExportAccreditationExcelUseCase) {}
  @Get('accreditation/xlsx')
  @RequirePermissions('reportes:read')
  @UseGuards(ReportExportGuard)
  async handle(
    @CurrentActor() actor: ActorContext,
    @Query(new ZodValidationPipe(accreditationFilterSchema)) filter: AccreditationFilter,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.usecase.execute(actor, filter);
    response.type(file.mime).setHeader('Content-Length', String(file.bytes.length));
    response.setHeader('Content-Disposition', 'attachment; filename="' + file.name + '"');
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(file.bytes);
  }
}