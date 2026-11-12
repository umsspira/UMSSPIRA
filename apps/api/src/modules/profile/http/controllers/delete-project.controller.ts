import { Controller, Delete, HttpCode, Param } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { DeleteProjectUseCase } from '../../application/use-cases/delete-project.use-case';
import { profileIdSchema } from '../schemas/profile.schemas';

@Controller('perfil')
export class DeleteProjectController {
  constructor(private readonly useCase: DeleteProjectUseCase) {}

  // Solo el titulado dueño: un proyecto ajeno responde 403 (HU-19)
  @Delete('proyectos/:id')
  @HttpCode(204)
  @RequirePermissions('perfil:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(profileIdSchema)) id: string,
  ): Promise<void> {
    await this.useCase.execute(actor, id);
  }
}
