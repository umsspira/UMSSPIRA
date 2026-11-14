import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { StoredFile } from '../../../../shared/files/contracts/uploaded-file';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { CertificateTemplatesRepository } from '../../application/ports/certificate-templates-repository.port';
import type {
  CertificateTemplateFile,
  CertificateTemplateOverview,
  CertificateTemplateVersion,
} from '../../domain/entities/certificate-template';

@Injectable()
export class PrismaCertificateTemplatesRepository implements CertificateTemplatesRepository {
  private readonly logger = new Logger(PrismaCertificateTemplatesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async overview(ownerId: string, eventId: string): Promise<CertificateTemplateOverview> {
    const event = await this.ownedEvent(ownerId, eventId);
    const rows = await this.prisma.plantillaCertificadoEvento.findMany({
      where: { id_evento: eventId, estado: { in: ['ACTIVA', 'PENDIENTE'] } },
      select: {
        id: true,
        nombre: true,
        size_bytes: true,
        estado: true,
        fecha_creacion: true,
        fecha_activacion: true,
      },
    });
    const toFile = (row?: (typeof rows)[number]): CertificateTemplateFile | null =>
      row
        ? {
            id: row.id,
            name: row.nombre,
            size: row.size_bytes,
            uploadedAt: row.fecha_creacion,
            activatedAt: row.fecha_activacion,
          }
        : null;
    const active = toFile(rows.find((row) => row.estado === 'ACTIVA'));
    const pending = toFile(rows.find((row) => row.estado === 'PENDIENTE'));
    return {
      event: {
        id: event.id,
        title: event.titulo,
        startDate: event.fecha_inicio,
        location: event.ubicacion,
      },
      status: active ? 'HABILITADO' : pending ? 'EN_CONFIGURACION' : 'NO_CONFIGURADO',
      active,
      pending,
    };
  }

  async savePending(ownerId: string, eventId: string, file: StoredFile): Promise<void> {
    await this.ownedEvent(ownerId, eventId);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.plantillaCertificadoEvento.deleteMany({
          where: { id_evento: eventId, estado: 'PENDIENTE' },
        });
        await tx.plantillaCertificadoEvento.create({
          data: {
            id: file.id,
            id_evento: eventId,
            id_usuario: ownerId,
            nombre: file.name,
            mime: file.mime,
            contenido: new Uint8Array(file.bytes),
            size_bytes: file.size,
            estado: 'PENDIENTE',
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BusinessRuleError(
          'conflict',
          'TEMPLATE_UPLOAD_CONFLICT',
          'Se está cargando otra plantilla para este evento. Intenta nuevamente.',
        );
      }
      this.logger.error('No se pudo guardar la plantilla de certificado');
      throw error;
    }
  }

  async activatePending(ownerId: string, eventId: string): Promise<void> {
    await this.ownedEvent(ownerId, eventId);
    try {
      await this.prisma.$transaction(async (tx) => {
        const pending = await tx.plantillaCertificadoEvento.findFirst({
          where: { id_evento: eventId, estado: 'PENDIENTE' },
          select: { id: true },
        });
        if (!pending) {
          throw new BusinessRuleError(
            'missing',
            'TEMPLATE_PENDING_REQUIRED',
            'No hay una plantilla pendiente por guardar',
          );
        }
        // La anterior pasa a histórico; los certificados ya emitidos conservan su archivo (HU18).
        await tx.plantillaCertificadoEvento.updateMany({
          where: { id_evento: eventId, estado: 'ACTIVA' },
          data: { estado: 'REEMPLAZADA' },
        });
        await tx.plantillaCertificadoEvento.update({
          where: { id: pending.id },
          data: { estado: 'ACTIVA', fecha_activacion: new Date() },
        });
      });
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BusinessRuleError(
          'conflict',
          'TEMPLATE_UPLOAD_CONFLICT',
          'La plantilla ya se estaba guardando. Actualiza la pantalla e intenta nuevamente.',
        );
      }
      this.logger.error('No se pudo activar la plantilla de certificado');
      throw error;
    }
  }

  async readFile(
    ownerId: string,
    eventId: string,
    version: CertificateTemplateVersion,
  ): Promise<StoredFile> {
    await this.ownedEvent(ownerId, eventId);
    const row = await this.prisma.plantillaCertificadoEvento.findFirst({
      where: { id_evento: eventId, estado: version === 'active' ? 'ACTIVA' : 'PENDIENTE' },
    });
    if (!row) {
      throw new BusinessRuleError(
        'missing',
        'TEMPLATE_NOT_FOUND',
        'No se encontró la plantilla solicitada',
      );
    }
    return {
      id: row.id,
      name: row.nombre,
      mime: row.mime,
      bytes: row.contenido,
      size: row.size_bytes,
    };
  }

  /** Solo el administrador propietario del evento puede gestionar su plantilla. */
  private async ownedEvent(ownerId: string, eventId: string) {
    const row = await this.prisma.evento.findFirst({
      where: { id: eventId, id_usuario: ownerId, archivado: false },
      select: { id: true, titulo: true, fecha_inicio: true, ubicacion: true },
    });
    if (!row) {
      throw new BusinessRuleError(
        'missing',
        'EVENT_NOT_FOUND',
        'No se encontró el evento solicitado',
      );
    }
    return row;
  }
}
