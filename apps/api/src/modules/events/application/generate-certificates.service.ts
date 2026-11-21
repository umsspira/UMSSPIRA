import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PrismaCertificatesRepository } from '../infrastructure/repositories/prisma-certificates.repository';

@Injectable()
export class GenerateCertificatesService {
  private readonly logger = new Logger(GenerateCertificatesService.name);
  
  // 👉 T5: Mapa en memoria para guardar el progreso de cada evento
  private progressMap = new Map<string, { progress: number; status: string; results?: Record<string, unknown> }>();
  constructor(private readonly repository: PrismaCertificatesRepository) {}

  // 👉 T5: Método que el controlador consultará cada 2 segundos
  getStatus(eventId: string) {
    return this.progressMap.get(eventId) || { progress: 0, status: 'ESPERANDO' };
  }

  async execute(eventId: string) {
    // 1. Validar condiciones
    const { template } = await this.repository.getEventAndTemplateStatus(eventId);

    // 2. Obtener la lista de usuarios elegibles
    const participants = await this.repository.getEligibleParticipants(eventId);

    if (participants.length === 0) {
      return { procesados: 0, exitosos: 0, fallidos: 0, mensaje: 'No hay participantes elegibles' };
    }

    const results = { exitosos: 0, fallidos: 0 };
    let procesadosActual = 0;

    // 👉 T5: Iniciamos el progreso en 0%
    this.progressMap.set(eventId, { progress: 0, status: 'PROCESANDO' });

    // 3. Renderizado por lotes
    for (const participant of participants) {
      if (!participant.usuario) { continue; }

      try {
        const pdfDoc = await PDFDocument.load(template.contenido);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        const fullName = participant.usuario.nombre || 'Participante';
        const textWidth = font.widthOfTextAtSize(fullName, 30);
        const centerX = firstPage.getWidth() / 2 - textWidth / 2;

        firstPage.drawText(fullName, {
          x: centerX,
          y: firstPage.getHeight() / 2,
          size: 30,
          font: font,
          color: rgb(0, 0, 0),
        });

        const pdfBytes = await pdfDoc.save();
        await this.repository.saveCertificate(eventId, participant.usuario.usuario_id, pdfBytes);

        results.exitosos++;
      } catch (error) {
        this.logger.error(`Error generando certificado para ${participant.usuario.usuario_id}: ${(error as Error).message}`);
        results.fallidos++;
      }

      // 👉 T5: Actualizamos el progreso real después de cada participante
      procesadosActual++;
      const porcentaje = Math.round((procesadosActual / participants.length) * 100);
      this.progressMap.set(eventId, { progress: porcentaje, status: 'PROCESANDO' });
    }  
    
    // 👉 T5: Marcamos como completado al terminar el bucle
    const finalResult = {
      procesados: participants.length,
      exitosos: results.exitosos,
      fallidos: results.fallidos,
      mensaje: 'Proceso de generación finalizado'
    };

    this.progressMap.set(eventId, { 
      progress: 100, 
      status: 'COMPLETADO', 
      results: finalResult 
    });

    return finalResult;
  }
}