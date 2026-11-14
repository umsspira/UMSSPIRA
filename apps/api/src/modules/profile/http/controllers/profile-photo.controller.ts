import { Controller, Get, HttpCode, Put, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { UploadedFileData } from '../../../../shared/files/contracts/uploaded-file';
import { MAX_PROFILE_PHOTO_BYTES } from '../../domain/policies/profile-photo.policy';
import {
  ReadProfilePhotoUseCase,
  SaveProfilePhotoUseCase,
} from '../../application/use-cases/profile-photo.use-case';

// Foto de perfil del titulado (HU-16, T16.2)
@Controller('perfil')
export class ProfilePhotoController {
  constructor(
    private readonly saveUseCase: SaveProfilePhotoUseCase,
    private readonly readUseCase: ReadProfilePhotoUseCase,
  ) {}

  @Put('foto')
  @HttpCode(204)
  @RequirePermissions('perfil:self:write')
  @UseInterceptors(
    FileInterceptor('foto', { limits: { fileSize: MAX_PROFILE_PHOTO_BYTES, files: 1, fields: 0 } }),
  )
  async save(@CurrentActor() actor: ActorContext, @UploadedFile() file?: UploadedFileData): Promise<void> {
    await this.saveUseCase.execute(actor, file);
  }

  @Get('foto')
  @RequirePermissions('perfil:self:read')
  async read(@CurrentActor() actor: ActorContext, @Res() response: Response): Promise<void> {
    const photo = await this.readUseCase.execute(actor);
    response.type(photo.mime).setHeader('Content-Length', String(photo.size));
    // Al cambiar la foto la web la pide de nuevo; no se guarda en una caché compartida
    response.setHeader('Cache-Control', 'private, no-cache');
    response.send(Buffer.from(photo.bytes));
  }
}
