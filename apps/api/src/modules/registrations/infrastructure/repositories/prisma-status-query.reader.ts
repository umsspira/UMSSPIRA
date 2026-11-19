import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type {
  StatusQueryReader,
  StatusQueryRecord,
} from '../../application/contracts/request-status.dto';
import { STATUS_QUERY_STATES } from '../../domain/policies/status-query.policy';

@Injectable()
export class PrismaStatusQueryReader implements StatusQueryReader {
  constructor(private readonly prisma: PrismaService) {}

  // Solicitud enviada más reciente del correo verificado. No escribe nada (CA-18.7).
  async findLatestByEmail(email: string): Promise<StatusQueryRecord | null> {
    const row = await this.prisma.solicitud.findFirst({
      where: {
        estado: { in: Object.keys(STATUS_QUERY_STATES) },
        detalle_solicitud: { is: { email: { equals: email, mode: 'insensitive' } } },
      },
      orderBy: [
        { fecha_creacion: { sort: 'desc', nulls: 'last' } },
        { fecha_actualizacion: 'desc' },
      ],
      select: {
        id: true,
        estado: true,
        activada_en: true,
        detalle_solicitud: { select: { email: true, nombre: true, apellido: true } },
      },
    });

    const storedEmail = row?.detalle_solicitud?.email;
    const state = STATUS_QUERY_STATES[row?.estado ?? ''];
    if (!row || !storedEmail || !state) {
      return null;
    }
    const fullName = [row.detalle_solicitud?.nombre, row.detalle_solicitud?.apellido]
      .filter(Boolean)
      .join(' ')
      .trim();
    return {
      applicationId: row.id,
      email: storedEmail,
      fullName: fullName || null,
      state,
      activated: row.activada_en !== null,
    };
  }
}