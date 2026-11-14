import { Controller, Get, Query } from '@nestjs/common';
import type { z } from 'zod';

import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';

import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';

import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';

import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';

import { GetAccreditationDashboardUseCase } from '../../application/use-cases/get-accreditation-dashboard.use-case';

import { accreditationFilterSchema } from '../schemas/reports.schemas';
import { extractAccreditationFilters } from '../../application/contracts/accreditation-filters';

@Controller('reports')
@Roles('administrador')
export class GetAccreditationDashboardController {
  constructor(private readonly useCase: GetAccreditationDashboardUseCase) {}

  @Get('accreditation')
  @RequirePermissions('reportes:read')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Query(new ZodValidationPipe(accreditationFilterSchema))
    query: z.infer<typeof accreditationFilterSchema>,
  ) {
    const filters = extractAccreditationFilters(query);
    const dashboard = await this.useCase.execute(actor, query.careerId, filters);

    return { data: dashboard };
  }
}
