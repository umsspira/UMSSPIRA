import { Controller, Param, Patch } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { CancelMyMentorshipRequestUseCase } from '../../application/use-cases/cancel-my-mentorship-request.use-case';
import { mentorshipRequestIdSchema } from '../schemas/mentorship-request-id.schema';
import { presentMyMentorshipRequest } from '../presenters/mentorship-request.presenter';

@Controller('mentorship/my-requests')
export class CancelMyMentorshipRequestController {
  constructor(private readonly useCase: CancelMyMentorshipRequestUseCase) {}

  @Patch(':id/cancel')
  @RequirePermissions('mentores:self:write')
  async cancel(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(mentorshipRequestIdSchema)) requestId: string,
  ) {
    return {
      data: presentMyMentorshipRequest(await this.useCase.execute(actor, requestId)),
    };
  }
}
