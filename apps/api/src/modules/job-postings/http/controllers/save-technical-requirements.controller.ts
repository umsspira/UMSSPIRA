import { Body, Controller, Param, Put } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { SaveTechnicalRequirementsUseCase } from '../../application/use-cases/save-technical-requirements.use-case';
import { presentTechnicalRequirements } from '../presenters/technical-requirements.presenter';
import {
  saveTechnicalRequirementsSchema,
  type SaveTechnicalRequirementsBody,
  vacancyIdSchema,
} from '../schemas/technical-requirements.schemas';

@Controller('job-postings')
export class SaveTechnicalRequirementsController {
  constructor(private readonly useCase: SaveTechnicalRequirementsUseCase) {}

  @Put(':vacancyId/technical-requirements')
  @RequirePermissions('vacantes:create')
  async save(
    @CurrentActor() actor: ActorContext,
    @Param('vacancyId', new ZodValidationPipe(vacancyIdSchema)) vacancyId: string,
    @Body(new ZodValidationPipe(saveTechnicalRequirementsSchema))
    body: SaveTechnicalRequirementsBody,
  ) {
    return {
      data: presentTechnicalRequirements(
        await this.useCase.execute(actor, vacancyId, body.requisitos),
      ),
    };
  }
}
