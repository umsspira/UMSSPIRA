import { Controller, Get } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { GetCompetencyHeatmapUseCase } from '../../application/use-cases/get-competency-heatmap.use-case';

@Controller('reports')
@Roles('administrador')
export class GetCompetencyHeatmapController {
  constructor(private readonly useCase: GetCompetencyHeatmapUseCase) {}

  @Get('accreditation/heatmap')
  @RequirePermissions('reportes:read')
  async handle(@CurrentActor() actor: ActorContext) {
    // Integración T2.2: consumir GET /api/v1/reports/accreditation/heatmap
    // para construir la matriz, leyenda y vista móvil del mapa.
    return { data: await this.useCase.execute(actor) };
  }
}
