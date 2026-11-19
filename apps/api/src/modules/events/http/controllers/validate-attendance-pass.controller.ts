import { Body, Controller, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { ValidateEventPassInput, EventAttendanceResult } from '@umsspira/shared-types';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ValidateAttendancePassService } from '../../application/validate-attendance-pass.service';
import { eventIdSchema, recordAttendanceSchema } from '../schemas/events.schemas';

@Controller('events')
export class ValidateAttendancePassController {
  constructor(private readonly service: ValidateAttendancePassService) {}

  @Post('owned/:id/attendance')
  @RequirePermissions('eventos:manage')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(eventIdSchema)) eventId: string,
    @Body(new ZodValidationPipe(recordAttendanceSchema)) body: ValidateEventPassInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ data: EventAttendanceResult }> {
    const data = await this.service.execute(actor, eventId, body.qrToken);
    response.status(data.code === 'ATTENDANCE_RECORDED' ? 201 : 200);
    return { data };
  }
}
