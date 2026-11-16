import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';

@Injectable()
export class PrismaCertificatesRepository {
  private readonly logger = new Logger(PrismaCertificatesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // T1: Consulta de elegibilidad
  async getEligibleParticipants(eventId: string) {
    // Busca inscripciones con asistencia registrada, que NO tengan ya un certificado
    return this.prisma.inscripcionEvento.findMany({
      where: {
        id_evento: eventId,
        asistencia: { isNot: null }, // Tiene asistencia registrada
        usuario: {
          certificados: { none: { id_evento: eventId } }, // Evita duplicados (T3)
        },
      },
      include: { usuario: true },
    });
  }

  // Validación de precondiciones del evento
  async getEventAndTemplateStatus(eventId: string) {
    const event = await this.prisma.evento.findUnique({
      where: { id: eventId },
      include: { plantillas_certificado: { where: { estado: 'ACTIVA' } } },
    });

    if (!event) {throw new Error('Evento no encontrado');}
    if (event.estado !== 'FINALIZADO') {throw new Error('El evento no ha finalizado');}
    if (event.plantillas_certificado.length === 0) {throw new Error('No hay plantilla activa');}

    return {
      event,
      template: event.plantillas_certificado[0], // Plantilla ACTIVA (HU17)
    };
  }

  // T3: Guardado idempotente (Control de duplicados)
  async saveCertificate(eventId: string, userId: string, fileBytes: Uint8Array) {
    try {
      await this.prisma.certificado.create({
        data: {
          id_evento: eventId,
          id_usuario: userId,
          contenido: Buffer.from(fileBytes),
        },
      });
    } catch (error) {
      // Manejo de concurrencia: Evita duplicados con un tipado que ESLint aprueba
      if ((error as Record<string, unknown>).code === 'P2002') {
        this.logger.warn(`El certificado para usuario ${userId} y evento ${eventId} ya existía.`);
        return;
      }
      throw error;
    }
  }
}