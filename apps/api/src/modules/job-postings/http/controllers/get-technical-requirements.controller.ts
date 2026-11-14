import { Controller, Get, Param } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { GetTechnicalRequirementsUseCase } from '../../application/use-cases/get-technical-requirements.use-case';
import { presentTechnicalRequirements } from '../presenters/technical-requirements.presenter';
import { vacancyIdSchema } from '../schemas/technical-requirements.schemas';

@Controller('job-postings')
export class GetTechnicalRequirementsController {
  constructor(private readonly useCase: GetTechnicalRequirementsUseCase) {}

  @Get(':vacancyId/technical-requirements')
  @RequirePermissions('vacantes:create')
  async get(
    @CurrentActor() actor: ActorContext,
    @Param('vacancyId', new ZodValidationPipe(vacancyIdSchema)) vacancyId: string,
  ) {
    return { data: presentTechnicalRequirements(await this.useCase.execute(actor, vacancyId)) };
  }
}
