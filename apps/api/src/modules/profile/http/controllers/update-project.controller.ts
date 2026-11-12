import { Body, Controller, Param, Put } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { UpdateProjectUseCase } from '../../application/use-cases/update-project.use-case';
import { presentProject } from '../presenters/project.presenter';
import { profileIdSchema } from '../schemas/profile.schemas';
import { projectSchema, type ProjectBody } from '../schemas/project.schemas';

@Controller('perfil')
export class UpdateProjectController {
  constructor(private readonly useCase: UpdateProjectUseCase) {}

  // Solo el titulado dueño: un proyecto ajeno responde 403 (HU-19)
  @Put('proyectos/:id')
  @RequirePermissions('perfil:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(profileIdSchema)) id: string,
    @Body(new ZodValidationPipe(projectSchema)) body: ProjectBody,
  ) {
    return { data: presentProject(await this.useCase.execute(actor, id, body)) };
  }
}
