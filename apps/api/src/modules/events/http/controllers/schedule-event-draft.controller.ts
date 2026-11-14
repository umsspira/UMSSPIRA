import { Body, Controller, Param, Patch } from '@nestjs/common';
import { z } from 'zod';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ScheduleEventDraftUseCase } from '../../application/use-cases/schedule-event-draft.use-case';
import { presentEvent } from '../presenters/event.presenter';
import { eventIdSchema } from '../schemas/events.schemas';

const scheduleSchema = z.strictObject({
  scheduledAt: z.iso.datetime({ offset: true }),
});

@Controller('events')
export class ScheduleEventDraftController {
  constructor(private readonly useCase: ScheduleEventDraftUseCase) {}

  @Patch('drafts/:id/schedule')
  @RequirePermissions('eventos:manage')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(eventIdSchema)) id: string,
    @Body(new ZodValidationPipe(scheduleSchema))
    body: z.infer<typeof scheduleSchema>,
  ) {
    const event = await this.useCase.execute(actor, id, new Date(body.scheduledAt));
    return {
      data: {
        ...presentEvent(event),
        scheduledAt: new Date(body.scheduledAt).toISOString(),
        schedulingStatus: 'PENDIENTE',
      },
    };
  }
}
