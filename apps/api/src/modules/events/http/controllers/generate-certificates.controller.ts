import { Controller, Post, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { GenerateCertificatesService } from '../../application/generate-certificates.service';

@Controller('events')
export class GenerateCertificatesController {
  constructor(private readonly generateCertificatesService: GenerateCertificatesService) {}

  // Endpoint original para iniciar el proceso (T1-T3)
  @Post(':eventId/certificates/generate')
  @HttpCode(HttpStatus.OK)
  async generateCertificates(@Param('eventId') eventId: string) {
    // Al no usar await aquí y devolver inmediatamente, el proceso corre en segundo plano
    // (Ideal para lotes grandes y evitar Timeouts HTTP)
    this.generateCertificatesService.execute(eventId).catch(e => console.error(e));
    
    return {
      message: 'Proceso de generación de certificados iniciado'
    };
  }

  // 👉 T5: Nuevo endpoint para consultar el progreso (Polling)
  @Get(':eventId/certificates/status')
  @HttpCode(HttpStatus.OK)
  getStatus(@Param('eventId') eventId: string) {
    return this.generateCertificatesService.getStatus(eventId);
  }
}