import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';

@Injectable()
export class PrismaCertificatesRepository {
  private readonly logger = new Logger(PrismaCertificatesRepository.name);

  constructor(private readonly prisma: PrismaService) {}


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

    if (!event) {
      throw new Error('Evento no encontrado');
    }

    if (event.estado === 'BORRADOR' || event.estado === 'CANCELADO') {
      throw new Error('El evento debe estar publicado para emitir certificados');
    }

    // 👉 Descomenta esto cuando quieras validar por fecha real (ajusta el nombre del campo según tu schema.prisma, ej: fecha_fin):
    // if (event.fecha_fin && new Date(event.fecha_fin) > new Date()) {
    //   throw new Error('El evento aún no ha finalizado');
    // }

    if (event.plantillas_certificado.length === 0) {
      throw new Error('No hay plantilla activa');
    }

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
  // Resumen real para la página de emisión (HU18)
  async getEmissionSummary(eventId: string) {
    const inscripciones = await this.prisma.inscripcionEvento.findMany({
      where: { id_evento: eventId },
      include: {
        asistencia: true,
        usuario: {
          include: {
            certificados: { where: { id_evento: eventId } },
          },
        },
      },
    });

    const totalInscripciones = inscripciones.length;
    const conAsistencia = inscripciones.filter((i) => i.asistencia !== null);
    const totalAsistencias = conAsistencia.length;
    const sinAsistencia = totalInscripciones - totalAsistencias;

    const detalles = conAsistencia.map((item) => {
     const u = item.usuario as unknown as Record<string, unknown>;
      const nombre =
        (typeof u?.nombre_completo === 'string' && u.nombre_completo) ||
        [u?.nombres, u?.apellidos].filter((v): v is string => typeof v === 'string' && v.length > 0).join(' ') ||
        (typeof u?.nombre === 'string' && u.nombre) ||
        (typeof u?.email === 'string' && u.email) ||
        'Participante';

      const yaEmitido = Array.isArray(item.usuario?.certificados) && item.usuario.certificados.length > 0;

      return {
        id_usuario: item.id_usuario,
        nombre,
        estado: (yaEmitido ? 'GENERADO' : 'PENDIENTE') as 'GENERADO' | 'PENDIENTE',
      };
    });

    const emitidos = detalles.filter((d) => d.estado === 'GENERADO').length;

    return {
      inscripciones: totalInscripciones,
      asistencias: totalAsistencias,
      sinAsistencia,
      emitidos,
      detalles,
    };
  }
}