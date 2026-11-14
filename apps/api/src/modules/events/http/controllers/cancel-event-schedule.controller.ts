import { Controller, Param, Patch } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { CancelEventScheduleUseCase } from '../../application/use-cases/cancel-event-schedule.use-case';
import { presentEvent } from '../presenters/event.presenter';
import { eventIdSchema } from '../schemas/events.schemas';

@Controller('events')
export class CancelEventScheduleController {
  constructor(private readonly useCase: CancelEventScheduleUseCase) {}

  @Patch('drafts/:id/schedule/cancel')
  @RequirePermissions('eventos:manage')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(eventIdSchema)) id: string,
  ) {
    return { data: presentEvent(await this.useCase.execute(actor, id)) };
  }
}
