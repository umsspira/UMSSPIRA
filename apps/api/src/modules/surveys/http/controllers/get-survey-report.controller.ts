import {
  Controller,
  Get,
  Inject,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { reportScope } from '../../../reports/application/services/report-scope';
import type { SurveyRepositoryPort } from '../../application/ports/survey-repository.port';
import { SURVEY_REPOSITORY_PORT } from '../../infrastructure/providers/surveys.providers';

export const surveyReportQuerySchema = z.strictObject({
  careerId: z
    .uuid()
    .transform((value) => value.toLowerCase())
    .optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(10),
});

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
    @Query(new ZodValidationPipe(surveyReportQuerySchema))
    query: z.infer<typeof surveyReportQuerySchema>,
  ) {
    const careerIds = reportScope(actor, query.careerId);

    const report = await this.repository.getSurveyReport({
      careerIds,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: report,
    };
  }
}