import { Body, Controller, Post } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { CreateProjectUseCase } from '../../application/use-cases/create-project.use-case';
import { presentProject } from '../presenters/project.presenter';
import { projectSchema, type ProjectBody } from '../schemas/project.schemas';

@Controller('perfil')
export class CreateProjectController {
  constructor(private readonly useCase: CreateProjectUseCase) {}

  // Responde 201 con el proyecto creado; un enlace que no es https válido responde 400 (HU-19)
  @Post('proyectos')
  @RequirePermissions('perfil:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(projectSchema)) body: ProjectBody,
  ) {
    return { data: presentProject(await this.useCase.execute(actor, body)) };
  }
}
