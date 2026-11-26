import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { RADAR_AREA_IDS } from '../../domain/entities/radar-area';
import { PrismaAreaWeightReaderAdapter } from './prisma-area-weight-reader.adapter';

describe('PrismaAreaWeightReaderAdapter', () => {
  it('lee palabra_clave_area filtrando por las 6 áreas del radar y agrupa los pesos por UUID', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id_area: RADAR_AREA_IDS['software-development'],
        id_palabra_clave: 'keyword-1',
        peso: 5,
        palabra_clave: { termino_normalizado: 'javascript' },
      },
      {
        id_area: RADAR_AREA_IDS['software-development'],
        id_palabra_clave: 'keyword-2',
        peso: 4,
        palabra_clave: { termino_normalizado: 'typescript' },
      },
      {
        id_area: RADAR_AREA_IDS['data-ai'],
        id_palabra_clave: 'keyword-3',
        peso: 3,
        palabra_clave: { termino_normalizado: 'python' },
      },
      {
        id_area: '60000000-0000-4000-8000-000000000018',
        id_palabra_clave: 'keyword-4',
        peso: 4,
        palabra_clave: { termino_normalizado: 'postgresql' },
      },
    ]);
    const adapter = new PrismaAreaWeightReaderAdapter({
      palabraClaveArea: { findMany },
    } as unknown as PrismaService);

    await expect(adapter.getAreaWeights()).resolves.toEqual({
      [RADAR_AREA_IDS['software-development']]: [
        { term: 'javascript', peso: 5 },
        { term: 'typescript', peso: 4 },
      ],
      [RADAR_AREA_IDS['data-ai']]: [{ term: 'python', peso: 3 }],
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        id_area: { in: Object.values(RADAR_AREA_IDS) },
      },
      select: {
        id_area: true,
        peso: true,
        palabra_clave: { select: { termino_normalizado: true } },
      },
      orderBy: [{ id_area: 'asc' }, { id_palabra_clave: 'asc' }],
    });
  });

  it('devuelve catálogo vacío si no existen asociaciones', async () => {
    const adapter = new PrismaAreaWeightReaderAdapter({
      palabraClaveArea: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService);

    await expect(adapter.getAreaWeights()).resolves.toEqual({});
  });
});