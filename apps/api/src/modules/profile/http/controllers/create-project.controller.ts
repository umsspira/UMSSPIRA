import { Body, Controller, Post } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ProjectInput } from '../../application/contracts/profile-inputs';
import { CreateProjectUseCase } from '../../application/use-cases/create-project.use-case';
import { presentProfileRecord } from '../presenters/profile.presenter';
import { projectSchema } from '../schemas/profile.schemas';

@Controller('perfil')
export class CreateProjectController {
  constructor(private readonly useCase: CreateProjectUseCase) {}

  @Post('proyectos')
  @RequirePermissions('perfil:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(projectSchema)) body: ProjectInput,
  ) {
    return { data: presentProfileRecord(await this.useCase.execute(actor, body)) };
  }
}
