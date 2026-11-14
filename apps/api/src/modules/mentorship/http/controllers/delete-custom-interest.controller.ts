import { Controller, Delete, Param } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { DeleteCustomInterestUseCase } from '../../application/use-cases/delete-custom-interest.use-case';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { mentorIdSchema } from '../schemas/mentorship.schemas';

@Controller('mentorship/interests')
export class DeleteCustomInterestController {
  constructor(private readonly useCase: DeleteCustomInterestUseCase) {}

  @Delete('custom/:id')
  @RequirePermissions('mentores:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(mentorIdSchema)) id: string,
  ) {
    return { data: await this.useCase.execute(actor, id) };
  }
}
