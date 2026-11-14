import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { z } from 'zod';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { UploadedFileData } from '../../../../shared/files/contracts/uploaded-file';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ConfirmCertificateTemplateUseCase } from '../../application/use-cases/confirm-certificate-template.use-case';
import { GetCertificateTemplateUseCase } from '../../application/use-cases/get-certificate-template.use-case';
import { ReadCertificateTemplateFileUseCase } from '../../application/use-cases/read-certificate-template-file.use-case';
import { UploadCertificateTemplateUseCase } from '../../application/use-cases/upload-certificate-template.use-case';
import type {
  CertificateTemplateFile,
  CertificateTemplateOverview,
} from '../../domain/entities/certificate-template';
import { MAX_CERTIFICATE_TEMPLATE_BYTES } from '../../domain/policies/certificate-template.policy';
import { eventIdSchema } from '../schemas/events.schemas';

const versionSchema = z.enum(['active', 'pending']).default('active');

function presentFile(file: CertificateTemplateFile | null) {
  return file
    ? {
        id: file.id,
        fileName: file.name,
        sizeBytes: file.size,
        uploadedAt: file.uploadedAt.toISOString(),
        activatedAt: file.activatedAt?.toISOString() ?? null,
      }
    : null;
}

function presentOverview(
  overview: CertificateTemplateOverview & { missingFields?: string[] },
) {
  return {
    event: {
      id: overview.event.id,
      title: overview.event.title,
      startDate: overview.event.startDate?.toISOString() ?? null,
      location: overview.event.location,
    },
    status: overview.status,
    activeTemplate: presentFile(overview.active),
    pendingTemplate: presentFile(overview.pending),
    missingFields: overview.missingFields ?? [],
    maxFileBytes: MAX_CERTIFICATE_TEMPLATE_BYTES,
    allowedFormats: ['application/pdf'],
  };
}

@Controller('events')
export class CertificateTemplateController {
  constructor(
    private readonly getTemplate: GetCertificateTemplateUseCase,
    private readonly uploadTemplate: UploadCertificateTemplateUseCase,
    private readonly confirmTemplate: ConfirmCertificateTemplateUseCase,
    private readonly readFile: ReadCertificateTemplateFileUseCase,
  ) {}

  @Get(':id/certificate-template')
  @RequirePermissions('eventos:manage')
  async get(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(eventIdSchema)) id: string,
  ) {
    return { data: presentOverview(await this.getTemplate.execute(actor, id)) };
  }

  @Post(':id/certificate-template')
  @RequirePermissions('eventos:manage')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_CERTIFICATE_TEMPLATE_BYTES, files: 1, fields: 0 },
    }),
  )
  async upload(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(eventIdSchema)) id: string,
    @UploadedFile() file?: UploadedFileData,
  ) {
    await this.uploadTemplate.execute(actor, id, file);
    return { data: presentOverview(await this.getTemplate.execute(actor, id)) };
  }

  @Post(':id/certificate-template/confirm')
  @RequirePermissions('eventos:manage')
  async confirm(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(eventIdSchema)) id: string,
  ) {
    await this.confirmTemplate.execute(actor, id);
    return { data: presentOverview(await this.getTemplate.execute(actor, id)) };
  }

  @Get(':id/certificate-template/file')
  @RequirePermissions('eventos:manage')
  async file(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(eventIdSchema)) id: string,
    @Query('version', new ZodValidationPipe(versionSchema)) version: 'active' | 'pending',
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.readFile.execute(actor, id, version);
    response.type(file.mime).setHeader('Content-Length', String(file.size));
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Disposition',
      'inline; filename="plantilla.pdf"; filename*=UTF-8\'\'' + encodeURIComponent(file.name),
    );
    response.send(Buffer.from(file.bytes));
  }
}
