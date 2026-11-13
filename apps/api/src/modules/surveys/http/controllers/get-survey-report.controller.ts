import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Query,
} from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { SurveyRepositoryPort } from '../../application/ports/survey-repository.port';
import { SURVEY_REPOSITORY_PORT } from '../../infrastructure/providers/surveys.providers';

@Controller('reports')
export class GetSurveyReportController {
  constructor(
    @Inject(SURVEY_REPOSITORY_PORT)
    private readonly repository: SurveyRepositoryPort,
  ) {}

  @Get('surveys')
  @RequirePermissions('reportes:read')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('careerId') careerId?: string,
  ) {
    const allowedCareerIds = actor.scopes.careerIds ?? [];

    if (careerId && allowedCareerIds.length > 0 && !allowedCareerIds.includes(careerId)) {
      throw new ForbiddenException('No tiene acceso al reporte de esta carrera');
    }

    const targetCareerId = careerId ?? allowedCareerIds[0];
    if (!targetCareerId) {
      throw new ForbiddenException('No tiene una carrera asignada para consultar reportes');
    }

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    const safePage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const safeLimit =
      Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 10;

    const report = await this.repository.getSurveyReport({
      careerId: targetCareerId,
      page: safePage,
      limit: safeLimit,
    });

    return {
      data: report,
    };
  }
}