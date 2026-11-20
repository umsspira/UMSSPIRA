import { Controller, Get, Put, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { UploadedFileData } from '../../../../shared/files/contracts/uploaded-file';
import { MAX_CV_BYTES } from '../../domain/policies/cv-file.policy';
import { ReadCvUseCase } from '../../application/use-cases/read-cv.use-case';
import { UploadCvUseCase } from '../../application/use-cases/upload-cv.use-case';

@Controller('perfil')
export class CvController {
  constructor(
    private readonly uploadUseCase: UploadCvUseCase,
    private readonly readUseCase: ReadCvUseCase,
  ) {}

  @Put('cv')
  @RequirePermissions('perfil:self:write')
  @UseInterceptors(
    // Se permite leer 1 byte adicional para que la política devuelva el mensaje CA-04 exacto.
    FileInterceptor('archivo', { limits: { fileSize: MAX_CV_BYTES + 1, files: 1, fields: 0 } }),
  )
  async upload(
    @CurrentActor() actor: ActorContext,
    @UploadedFile() file?: UploadedFileData,
  ) {
    return { data: await this.uploadUseCase.execute(actor, file) };
  }

  @Get('cv')
  @RequirePermissions('perfil:self:read')
  async read(@CurrentActor() actor: ActorContext, @Res() response: Response): Promise<void> {
    const file = await this.readUseCase.execute(actor);
    response.type(file.mime).setHeader('Content-Length', String(file.size));
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    response.setHeader('Cache-Control', 'private, no-cache');
    response.send(Buffer.from(file.bytes));
  }
}
