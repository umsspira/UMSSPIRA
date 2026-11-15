import { Controller, Get, Param } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { HistoryEventsService } from '../../application/services/history-events.service';
import { GetApplicationUseCase } from '../../application/use-cases/get-application.use-case';
import { registrationIdSchema } from '../schemas/registrations.schemas';

@Controller('applications')
@RequirePermissions('solicitudes:read')
export class GetApplicationHistoryController {
  constructor(
    private readonly getApplication: GetApplicationUseCase,
    private readonly historyEvents: HistoryEventsService,
  ) {}

  @Get(':id/history')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(registrationIdSchema)) id: string,
  ) {
    await this.getApplication.execute(actor, id);
    const events = await this.historyEvents.getHistory(id);
    return {
      data: events.map((event) => ({
        id: event.id,
        version: event.version,
        actorType: event.tipo_actor,
        action: event.accion,
        detail: event.detalle,
        createdAt: event.creado_en.toISOString(),
      })),
    };
  }
}
