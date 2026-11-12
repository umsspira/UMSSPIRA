import { Controller, Get } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ListProjectsUseCase } from '../../application/use-cases/list-projects.use-case';
import { presentProject } from '../presenters/project.presenter';

@Controller('perfil')
export class ListProjectsController {
  constructor(private readonly useCase: ListProjectsUseCase) {}

  // Proyectos del titulado de la sesión, del más reciente al más antiguo (HU-19)
  @Get('proyectos')
  @RequirePermissions('perfil:self:read')
  async handle(@CurrentActor() actor: ActorContext) {
    return { data: (await this.useCase.execute(actor)).map(presentProject) };
  }
}
