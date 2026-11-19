import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CorrectionTokenGuard } from '../guards/correction-token.guard';
import { PublicRegistration } from '../decorators/public-registration.decorator';
import { CorrectionApplicationId } from '../decorators/correction-application-id.decorator';
import { ObservedApplicationService } from '../../application/services/observed-application.service';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { MAX_FILE_BYTES } from '../../domain/policies/registration.policy';
import type { UploadedDocument } from '../../application/contracts/registration-inputs';
import {
  submitCorrectionSchema,
  type SubmitCorrectionInput,
  updateObservedDataSchema,
  type UpdateObservedDataInput,
  replaceDocumentSchema,
  type ReplaceDocumentInput,
} from '../schemas/registrations.schemas';

@Controller('registrations/observed')
@PublicRegistration()
@UseGuards(CorrectionTokenGuard)
export class ObservedApplicationController {
  constructor(
    private readonly observedApplicationService: ObservedApplicationService,
  ) {}

  @Get()
  async getDetail(@CorrectionApplicationId() applicationId: string) {
    const data =
      await this.observedApplicationService.getObservedApplication(
        applicationId,
      );
    return { data };
  }

  @Get('document/content')
  async getDocumentContent(
    @CorrectionApplicationId() applicationId: string,
    @Res() response: Response,
  ): Promise<void> {
    const file =
      await this.observedApplicationService.getDocumentContent(applicationId);
    response.setHeader('Content-Type', file.mime);
    response.setHeader('Content-Length', String(file.size));
    response.setHeader(
      'Content-Disposition',
      'inline; filename="respaldo"; filename*=UTF-8\'\'' +
        encodeURIComponent(file.name),
    );
    response.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(Buffer.from(file.bytes));
  }

  @Patch()
  async updateData(
    @CorrectionApplicationId() applicationId: string,
    @Body(new ZodValidationPipe(updateObservedDataSchema))
    body: UpdateObservedDataInput,
  ) {
    const data =
      await this.observedApplicationService.updateObservedApplication(
        applicationId,
        body,
      );
    return { data };
  }

  @Post('document')
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 2, fieldSize: 256 },
    }),
  )
  async replaceDocument(
    @CorrectionApplicationId() applicationId: string,
    @UploadedFiles() files?: UploadedDocument[] | UploadedDocument,
    @Body(new ZodValidationPipe(replaceDocumentSchema))
    body?: ReplaceDocumentInput,
  ) {
    const file = Array.isArray(files) ? files[0] : (files as UploadedDocument | undefined);
    const data = await this.observedApplicationService.replaceDocument(
      applicationId,
      file!,
      body?.tipoDocumento,
    );
    return { data };
  }

  @Post('submit')
  async submitCorrection(
    @CorrectionApplicationId() applicationId: string,
    @Body(new ZodValidationPipe(submitCorrectionSchema))
    body: SubmitCorrectionInput,
  ) {
    const data = await this.observedApplicationService.submitCorrection(
      applicationId,
      body,
    );
    return { data };
  }
}