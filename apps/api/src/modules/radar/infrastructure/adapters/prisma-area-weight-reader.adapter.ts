import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type {
  AreaWeightReaderPort,
  AreaWeightsById,
} from '../../application/ports/area-weight-reader.port';

@Injectable()
export class PrismaAreaWeightReaderAdapter implements AreaWeightReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async getAreaWeights(): Promise<AreaWeightsById> {
    const rows = await this.prisma.palabraClaveArea.findMany({
      select: {
        id_area: true,
        peso: true,
        palabra_clave: { select: { termino_normalizado: true } },
      },
      orderBy: [{ id_area: 'asc' }, { id_palabra_clave: 'asc' }],
    });
    const result: AreaWeightsById = {};

    for (const row of rows) {
      (result[row.id_area] ??= []).push({
        term: row.palabra_clave.termino_normalizado,
        peso: Number(row.peso),
      });
    }

    return result;
  }
}
