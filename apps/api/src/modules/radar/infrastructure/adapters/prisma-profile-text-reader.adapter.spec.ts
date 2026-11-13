import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { calculateInputHash } from '../../domain/policies/input-hash';
import { PrismaProfileTextReaderAdapter } from './prisma-profile-text-reader.adapter';

function buildPrisma(params: {
  description?: { descripcion_profesional: string | null } | null;
  otherDescriptions?: Array<{ descripcion_profesional: string | null }>;
}) {
  const findFirst = jest.fn().mockResolvedValue(params.description ?? null);
  const findManyDescriptions = jest.fn().mockResolvedValue(params.otherDescriptions ?? []);
  const prisma = {
    formacionAcademica: { findMany: jest.fn().mockResolvedValue([]) },
    experienciaLaboral: { findMany: jest.fn().mockResolvedValue([]) },
    certificacion: { findMany: jest.fn().mockResolvedValue([]) },
    perfilArea: { findFirst, findMany: findManyDescriptions },
  };

  return {
    adapter: new PrismaProfileTextReaderAdapter(prisma as unknown as PrismaService),
    findFirst,
    findManyDescriptions,
  };
}

describe('PrismaProfileTextReaderAdapter', () => {
  it('lee solo la descripción vigente y no suma las demás filas de perfil_area', async () => {
    const { adapter, findFirst, findManyDescriptions } = buildPrisma({
      description: { descripcion_profesional: 'Descripción vigente' },
      otherDescriptions: [
        { descripcion_profesional: 'Descripción antigua' },
        { descripcion_profesional: 'Descripción duplicada' },
      ],
    });

    const result = await adapter.getProfileTexts('titulado-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: { id_titulado: 'titulado-1' },
      orderBy: [{ fecha_creacion: 'asc' }, { id: 'asc' }],
      select: { descripcion_profesional: true },
    });
    expect(findManyDescriptions).not.toHaveBeenCalled();
    expect(result.texts).toEqual(['Descripción vigente']);
  });

  it('conserva el hash de una sola fila', async () => {
    const { adapter } = buildPrisma({
      description: { descripcion_profesional: 'Descripción vigente' },
    });

    const result = await adapter.getProfileTexts('titulado-1');

    expect(calculateInputHash(result.texts)).toBe(
      calculateInputHash(['Descripción vigente']),
    );
  });

  it('devuelve textos vacíos cuando no hay fila en perfil_area', async () => {
    const { adapter, findFirst } = buildPrisma({ description: null });

    const result = await adapter.getProfileTexts('titulado-1');

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(result.texts).toEqual([]);
  });

  it('ignora una descripción vacía o con solo espacios', async () => {
    const { adapter } = buildPrisma({
      description: { descripcion_profesional: '   ' },
    });

    const result = await adapter.getProfileTexts('titulado-1');

    expect(result.texts).toEqual([]);
  });
});
