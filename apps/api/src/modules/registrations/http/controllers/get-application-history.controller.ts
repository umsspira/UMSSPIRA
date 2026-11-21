
import { Controller, Get, Param } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ApplicationHistoryService } from '../../application/services/application-history.service';
import { registrationIdSchema } from '../schemas/registrations.schemas';

@Controller('applications')
export class GetApplicationHistoryController {
  constructor(
    private readonly history: ApplicationHistoryService,
  ) {}

  @Get(':id/history')
  @RequirePermissions('solicitudes:read')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Param(
      'id',
      new ZodValidationPipe(registrationIdSchema),
    )
    id: string,
  ) {
    return {
      data: await this.history.execute(actor, id),
    };
  }
}
