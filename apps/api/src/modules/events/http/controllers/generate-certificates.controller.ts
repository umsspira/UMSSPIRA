import { Controller, Post, Get, Param, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { GenerateCertificatesService } from '../../application/generate-certificates.service';

@Controller('events')
export class GenerateCertificatesController {
  constructor(private readonly generateCertificatesService: GenerateCertificatesService) {}

  @Post(':eventId/certificates/generate')
  @RequirePermissions('eventos:manage')
  @HttpCode(HttpStatus.OK)
  async generateCertificates(@Param('eventId') eventId: string) {
    this.generateCertificatesService.execute(eventId).catch((e) => console.error(e));

    return {
      message: 'Proceso de generación de certificados iniciado',
    };
  }

  @Get(':eventId/certificates/status')
  @RequirePermissions('eventos:manage')
  @HttpCode(HttpStatus.OK)
  getStatus(@Param('eventId') eventId: string) {
    return this.generateCertificatesService.getStatus(eventId);
  }

  @Get(':eventId/certificates/summary')
  @RequirePermissions('eventos:manage')
  @HttpCode(HttpStatus.OK)
  async getSummary(@Param('eventId') eventId: string) {
    return this.generateCertificatesService['repository'].getEmissionSummary(eventId);
  }

  @Get(':eventId/certificates/:userId/download')
  @RequirePermissions('eventos:manage')
  async downloadPdf(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const certificado = await this.generateCertificatesService['repository']['prisma'].certificado.findFirst({
      where: { id_evento: eventId, id_usuario: userId },
    });

    if (!certificado) {
      return res.status(HttpStatus.NOT_FOUND).send('Certificado no encontrado');
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificado-${userId}.pdf"`,
    });

    return res.send(certificado.contenido);
  }
}