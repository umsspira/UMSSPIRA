
import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import type { AuthRequest } from '../../../../shared/http/auth/contracts/auth-request';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import { AccessError } from '../../../../shared/security/errors/access-error';
import { ListMyCertificatesService } from '../../application/list-my-certificates.service';
import { DownloadMyCertificateService } from '../../application/download-my-certificate.service';

@Controller('certificates')
export class MyCertificatesController {
  constructor(
    private readonly listMyCertificatesService: ListMyCertificatesService,
    private readonly downloadMyCertificateService: DownloadMyCertificateService,
  ) {}

  @Get('me')
  @Roles('titulado')
  @Header('Cache-Control', 'no-store')
  async listMyCertificates(@Req() request: AuthRequest) {
    const userId = request.auth?.actor.id;

    if (!userId) {
      throw new AccessError('UNAUTHENTICATED');
    }

    return this.listMyCertificatesService.execute(userId);
  }

  @Get('me/:certificateId/download')
  @Roles('titulado')
  async downloadMyCertificate(
    @Param('certificateId', new ParseUUIDPipe()) certificateId: string,
    @Req() request: AuthRequest,
    @Res() response: Response,
  ): Promise<void> {
    const userId = request.auth?.actor.id;

    if (!userId) {
      throw new AccessError('UNAUTHENTICATED');
    }

    const pdf = await this.downloadMyCertificateService.execute(
      certificateId,
      userId,
    );

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificado-${certificateId}.pdf"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    response.send(pdf);
  }
}
