import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { OcrReading } from '@umsspira/shared-types';
import { OcrResultsService } from '../../application/services/ocr-results.service';
import { ocrUuid as uuid, ocrCompletion as completion } from '../schemas/ocr.schemas';

@Controller('applications')
@RequirePermissions('solicitudes:read')
export class OcrResultsController {
  constructor(private readonly ocr: OcrResultsService) {}
  @Post('ocr/:jobId/complete')
  async complete(
    @CurrentActor() actor: ActorContext,
    @Param('jobId', new ZodValidationPipe(uuid)) id: string,
    @Body(new ZodValidationPipe(completion)) body: { token: string; reading: OcrReading },
  ) {
    return { data: await this.ocr.complete(actor, id, body.token, body.reading) };
  }
  @Get(':id/ocr')
  async analyses(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(uuid)) id: string,
  ) {
    return { data: await this.ocr.analyses(actor, id) };
  }
}
