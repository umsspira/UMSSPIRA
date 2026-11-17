import { Controller, Patch, Param, Body } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { UpdateCustomInterestUseCase } from '../../application/use-cases/update-custom-interest.use-case';
import { presentInterest } from '../presenters/mentor.presenter';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { mentorIdSchema, updateCustomInterestSchema } from '../schemas/mentorship.schemas';
import type { UpdateCustomInterestInput } from '../../application/contracts/mentor-inputs';

@Controller('mentorship/interests')
export class UpdateCustomInterestController {
  constructor(private readonly useCase: UpdateCustomInterestUseCase) {}

  @Patch('custom/:id')
  @RequirePermissions('mentores:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(mentorIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateCustomInterestSchema)) body: UpdateCustomInterestInput,
  ) {
    const updated = await this.useCase.execute(actor, id, body);
    return { data: presentInterest(updated) };
  }
}
