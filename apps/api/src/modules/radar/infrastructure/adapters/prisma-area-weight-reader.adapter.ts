import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type {
  AreaWeightReaderPort,
  AreaWeightsById,
} from '../../application/ports/area-weight-reader.port';
import { RADAR_AREA_IDS } from '../../domain/entities/radar-area';

const VALID_RADAR_AREA_IDS = Object.values(RADAR_AREA_IDS);
const VALID_RADAR_AREA_ID_SET = new Set<string>(VALID_RADAR_AREA_IDS);

@Injectable()
export class PrismaAreaWeightReaderAdapter implements AreaWeightReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async getAreaWeights(): Promise<AreaWeightsById> {
    const rows = await this.prisma.palabraClaveArea.findMany({
      where: {
        id_area: { in: VALID_RADAR_AREA_IDS },
      },
      select: {
        id_area: true,
        peso: true,
        palabra_clave: { select: { termino_normalizado: true } },
      },
      orderBy: [{ id_area: 'asc' }, { id_palabra_clave: 'asc' }],
    });
    const result: AreaWeightsById = {};

    for (const row of rows) {
      if (!VALID_RADAR_AREA_ID_SET.has(row.id_area)) {
        continue;
      }
      (result[row.id_area] ??= []).push({
        term: row.palabra_clave.termino_normalizado,
        peso: Number(row.peso),
      });
    }

    return result;
  }
}