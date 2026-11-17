import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { PrismaAreaWeightReaderAdapter } from './prisma-area-weight-reader.adapter';

describe('PrismaAreaWeightReaderAdapter', () => {
  it('lee palabra_clave_area y agrupa los pesos por UUID de área', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id_area: 'area-software',
        id_palabra_clave: 'keyword-1',
        peso: 5,
        palabra_clave: { termino_normalizado: 'javascript' },
      },
      {
        id_area: 'area-software',
        id_palabra_clave: 'keyword-2',
        peso: 4,
        palabra_clave: { termino_normalizado: 'typescript' },
      },
      {
        id_area: 'area-data',
        id_palabra_clave: 'keyword-3',
        peso: 3,
        palabra_clave: { termino_normalizado: 'python' },
      },
    ]);
    const adapter = new PrismaAreaWeightReaderAdapter({
      palabraClaveArea: { findMany },
    } as unknown as PrismaService);

    await expect(adapter.getAreaWeights()).resolves.toEqual({
      'area-software': [
        { term: 'javascript', peso: 5 },
        { term: 'typescript', peso: 4 },
      ],
      'area-data': [{ term: 'python', peso: 3 }],
    });
    expect(findMany).toHaveBeenCalledWith({
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
