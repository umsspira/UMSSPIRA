import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { AccreditationFilter } from '../../application/contracts/accreditation-filters';
import { ExportAccreditationPdfUseCase } from '../../application/use-cases/export-accreditation-pdf.use-case';
import { accreditationFilterSchema } from '../schemas/reports.schemas';
import { ReportExportGuard } from '../guards/report-export.guard';

/** HU-004: GET /reports/accreditation/pdf con los filtros aplicados en el tablero. */
@Controller('reports')
@Roles('administrador')
export class ExportAccreditationPdfController {
  constructor(private readonly useCase: ExportAccreditationPdfUseCase) {}

  @Get('accreditation/pdf')
  @RequirePermissions('reportes:read')
  @UseGuards(ReportExportGuard)
  async handle(
    @CurrentActor() actor: ActorContext,
    @Query(new ZodValidationPipe(accreditationFilterSchema)) filter: AccreditationFilter,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.useCase.execute(actor, filter);
    response.type(file.mime).setHeader('Content-Length', String(file.bytes.length));
    response.setHeader('Content-Disposition', 'attachment; filename="' + file.name + '"');
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(file.bytes);
  }
}
