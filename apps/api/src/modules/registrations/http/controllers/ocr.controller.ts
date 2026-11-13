import { Body, Controller, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { OcrService } from '../../application/services/ocr.service';
import { ocrUuid as uuid, ocrLease as lease } from '../schemas/ocr.schemas';

@Controller('applications')
@RequirePermissions('solicitudes:read')
export class OcrController {
  constructor(private readonly ocr: OcrService) {}
  @Post('ocr/statuses')
  async statuses(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(z.object({ ids: z.array(uuid).max(50) }).strict()))
    body: { ids: string[] },
  ) {
    return { data: await this.ocr.statuses(actor, body.ids) };
  }
  @Post('ocr/claim')
  async claim(
    @CurrentActor() actor: ActorContext,
    @Body(
      new ZodValidationPipe(
        z.object({ applicationIds: z.array(uuid).max(20).optional() }).strict(),
      ),
    )
    body: { applicationIds?: string[] },
  ) {
    return { data: await this.ocr.claim(actor, body.applicationIds) };
  }
  @Post('ocr/:jobId/renew')
  async renew(
    @CurrentActor() actor: ActorContext,
    @Param('jobId', new ZodValidationPipe(uuid)) id: string,
    @Body(new ZodValidationPipe(lease)) body: { token: string },
  ) {
    return { data: await this.ocr.renew(actor, id, body.token) };
  }
  // Token in POST body, never in URLs, logs or a signed public link.
  @Post('ocr/:jobId/document')
  async document(
    @CurrentActor() actor: ActorContext,
    @Param('jobId', new ZodValidationPipe(uuid)) id: string,
    @Body(new ZodValidationPipe(lease)) body: { token: string },
    @Res() res: Response,
  ) {
    const file = await this.ocr.document(actor, id, body.token);
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(file.bytes));
  }
  @Post('ocr/:jobId/fail')
  async fail(
    @CurrentActor() actor: ActorContext,
    @Param('jobId', new ZodValidationPipe(uuid)) id: string,
    @Body(new ZodValidationPipe(lease)) body: { token: string },
  ) {
    return { data: await this.ocr.fail(actor, id, body.token) };
  }
}
