import { Controller, Get, Param } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { GetJobPostingUseCase } from '../../application/use-cases/get-job-posting.use-case';
import { GetTechnicalRequirementsUseCase } from '../../application/use-cases/get-technical-requirements.use-case';
import { presentJobPosting } from '../presenters/job-posting.presenter';
import { presentTechnicalRequirements } from '../presenters/technical-requirements.presenter';
import { vacancyIdSchema } from '../schemas/technical-requirements.schemas';

@Controller('job-postings')
export class GetJobPostingController {
  constructor(
    private readonly postings: GetJobPostingUseCase,
    private readonly requirements: GetTechnicalRequirementsUseCase,
  ) {}

  @Get(':vacancyId')
  @RequirePermissions('vacantes:create')
  async get(
    @CurrentActor() actor: ActorContext,
    @Param('vacancyId', new ZodValidationPipe(vacancyIdSchema)) vacancyId: string,
  ) {
    const posting = await this.postings.execute(actor, vacancyId);
    const requirements = await this.requirements.execute(actor, vacancyId);
    return {
      data: {
        ...presentJobPosting(posting),
        requisitosTecnicos: presentTechnicalRequirements(requirements).requisitos,
      },
    };
  }
}
