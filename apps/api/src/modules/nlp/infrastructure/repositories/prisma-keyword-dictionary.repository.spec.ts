import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { PrismaKeywordDictionaryRepository } from './prisma-keyword-dictionary.repository';

describe('PrismaKeywordDictionaryRepository', () => {
  it('carga únicamente términos activos y alias normalizados', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        termino_normalizado: 'node.js',
        alias_registros: [{ alias_normalizado: 'nodejs' }, { alias_normalizado: 'node.js' }],
      },
      {
        termino_normalizado: 'javascript',
        alias_registros: [{ alias_normalizado: 'js' }],
      },
    ]);

    const prisma = { palabraClave: { findMany } } as unknown as PrismaService;
    const repository = new PrismaKeywordDictionaryRepository(prisma);

    await expect(repository.load()).resolves.toEqual([
      {
        canonical: 'node.js',
        aliases: ['nodejs', 'node.js'],
      },
      {
        canonical: 'javascript',
        aliases: ['js'],
      },
    ]);

    expect(findMany).toHaveBeenCalledWith({
      where: { esta_activo: true },
      select: {
        termino_normalizado: true,
        alias_registros: {
          select: { alias_normalizado: true },
          orderBy: { alias_normalizado: 'asc' },
        },
      },
      orderBy: { termino_normalizado: 'asc' },
    });
  });

  it('propaga el fallo de Prisma para que el loader responda 503', async () => {
    const findMany = jest.fn().mockRejectedValue(new Error('sin conexión'));
    const prisma = { palabraClave: { findMany } } as unknown as PrismaService;
    const repository = new PrismaKeywordDictionaryRepository(prisma);

    await expect(repository.load()).rejects.toThrow('sin conexión');
  });
});
