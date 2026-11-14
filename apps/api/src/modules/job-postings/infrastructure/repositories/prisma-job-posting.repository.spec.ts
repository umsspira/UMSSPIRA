import { PrismaJobPostingRepository } from './prisma-job-posting.repository';

describe('PrismaJobPostingRepository.listPublished', () => {
  it('limita la lectura oficial a los candidatos publicados y no vencidos', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new PrismaJobPostingRepository({
      vacante: { findMany },
    } as never);
    const now = new Date('2026-11-14T12:00:00.000Z');
    const ids = ['10000000-0000-4000-8000-000000000001'];
    await repository.listPublished(now, ids);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ids },
          estado: {
            in: [
              'PUBLICADO',
              'PUBLICADA',
              'ACTIVA',
              'ACTIVO',
              'ACTIVE',
              'PUBLISHED',
            ],
          },
          OR: [{ fecha_cierre: null }, { fecha_cierre: { gt: now } }],
        },
        orderBy: [{ fecha_publicacion: 'desc' }, { created_at: 'desc' }],
      }),
    );
  });

  it('sin candidatos evita una lectura completa accidental', async () => {
    const findMany = jest.fn();
    const repository = new PrismaJobPostingRepository({
      vacante: { findMany },
    } as never);
    await expect(repository.listPublished(new Date(), [])).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('sin filtro de candidatos mantiene el orden y el filtro originales', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new PrismaJobPostingRepository({
      vacante: { findMany },
    } as never);
    await repository.listPublished(new Date());
    expect(findMany.mock.calls[0][0].where).not.toHaveProperty('id');
    expect(findMany.mock.calls[0][0].orderBy).toEqual([
      { fecha_publicacion: 'desc' },
      { created_at: 'desc' },
    ]);
  });
});

describe('PrismaJobPostingRepository.findGraduateSkills', () => {
  it('loads skill evidence from the authenticated graduate record', async () => {
    const prisma = {
      titulado: {
        findUnique: jest.fn().mockResolvedValue({
          perfil_area_registros: [
            {
              area_id: 'area-software',
              descripcion_profesional: 'Desarrollo con TypeScript',
              area: { nombre: 'Desarrollo de software' },
            },
          ],
          experiencia_laboral_registros: [{ cargo: 'Desarrollador frontend' }],
          certificacion_registros: [{ nombre: 'React avanzado' }],
        }),
      },
    };
    const repository = new PrismaJobPostingRepository(prisma as never);

    await expect(repository.findGraduateSkills('graduate-id')).resolves.toEqual(
      {
        areaIds: ['area-software'],
        evidence: [
          'Desarrollo con TypeScript',
          'Desarrollo de software',
          'Desarrollador frontend',
          'React avanzado',
        ],
      },
    );
    expect(prisma.titulado.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'graduate-id' } }),
    );
  });

  it('returns null when the graduate profile does not exist', async () => {
    const prisma = {
      titulado: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const repository = new PrismaJobPostingRepository(prisma as never);

    await expect(
      repository.findGraduateSkills('missing-graduate'),
    ).resolves.toBeNull();
  });
});
