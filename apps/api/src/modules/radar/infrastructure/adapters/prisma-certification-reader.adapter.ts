import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { RadarCertificationReaderPort, RadarCertificationSource } from '../../application/ports/certification-reader.port';

@Injectable()
export class PrismaCertificationReaderAdapter implements RadarCertificationReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async getCertifications(graduateId: string): Promise<RadarCertificationSource[]> {
    const rows = await this.prisma.certificacion.findMany({
      where: { id_titulado: graduateId },
      orderBy: [{ anio_emision: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
      select: {
        id: true, nombre: true, entidad_emisora: true, anio_emision: true,
        certificacion_respaldo_registros: { select: { archivo: { select: { id_respaldo: true } } } },
      },
    });
    return rows.map(row => ({
      id: row.id, title: row.nombre, issuer: row.entidad_emisora,
      issuedYear: row.anio_emision,
      hasBackup: row.certificacion_respaldo_registros.some(backup => backup.archivo !== null),
    }));
  }
}
