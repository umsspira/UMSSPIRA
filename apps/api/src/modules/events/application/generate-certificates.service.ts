import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PrismaCertificatesRepository } from '../infrastructure/repositories/prisma-certificates.repository';

@Injectable()
export class GenerateCertificatesService {
  private readonly logger = new Logger(GenerateCertificatesService.name);

  constructor(private readonly repository: PrismaCertificatesRepository) {}

  async execute(eventId: string) {
    // 1. Validar condiciones (Evento FINALIZADO y Plantilla ACTIVA)
    const { template } = await this.repository.getEventAndTemplateStatus(eventId);

    // 2. Obtener la lista de usuarios elegibles
    const participants = await this.repository.getEligibleParticipants(eventId);

    if (participants.length === 0) {
      return { procesados: 0, exitosos: 0, fallidos: 0, mensaje: 'No hay participantes elegibles' };
    }

    const results = { exitosos: 0, fallidos: 0 };

      // 3. Renderizado por lotes (Batch processing)
    for (const participant of participants) {
      // 👉 ESTA LÍNEA QUITA EL ERROR ROJO: Asegura a TypeScript que el usuario existe
      if (!participant.usuario) {continue;}

      try {
        // Cargar el PDF base desde los Bytes guardados por la HU17
        const pdfDoc = await PDFDocument.load(template.contenido);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // Como ya validamos arriba, aquí ya no marcará rojo
        const fullName = participant.usuario.nombre || 'Participante';

        // Calcular el ancho del texto para centrarlo (T2)
        const textWidth = font.widthOfTextAtSize(fullName, 30);
        const centerX = firstPage.getWidth() / 2 - textWidth / 2;

        // Estampar el nombre del participante
        firstPage.drawText(fullName, {
          x: centerX,
          y: firstPage.getHeight() / 2, // Escribe en el centro
          size: 30,
          font: font,
          color: rgb(0, 0, 0),
        });

        // Generar los nuevos Bytes del certificado modificado
        const pdfBytes = await pdfDoc.save();

        // 4. Guardar en Base de Datos de manera segura (T3)
        await this.repository.saveCertificate(eventId, participant.usuario.usuario_id, pdfBytes);

        results.exitosos++;
      } catch (error) {
        // Casteo del error corregido para TypeScript
        this.logger.error(`Error generando certificado para ${participant.usuario.usuario_id}: ${(error as Error).message}`);
        results.fallidos++;
      }
    }  
    return {
      procesados: participants.length,
      exitosos: results.exitosos,
      fallidos: results.fallidos,
      mensaje: 'Proceso de generación finalizado'
    };
  }
}