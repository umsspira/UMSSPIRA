import { PrismaJobPostingRepository } from './prisma-job-posting.repository';

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

    await expect(repository.findGraduateSkills('graduate-id')).resolves.toEqual({
      areaIds: ['area-software'],
      evidence: [
        'Desarrollo con TypeScript',
        'Desarrollo de software',
        'Desarrollador frontend',
        'React avanzado',
      ],
    });
    expect(prisma.titulado.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'graduate-id' } }),
    );
  });

  it('returns null when the graduate profile does not exist', async () => {
    const prisma = {
      titulado: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const repository = new PrismaJobPostingRepository(prisma as never);

    await expect(repository.findGraduateSkills('missing-graduate')).resolves.toBeNull();
  });
});

describe('PrismaJobPostingRepository.listPublished', () => {
  it('returns an empty list and excludes unpublished or expired postings at the query boundary', async () => {
    const prisma = { vacante: { findMany: jest.fn().mockResolvedValue([]) } };
    const repository = new PrismaJobPostingRepository(prisma as never);
    const now = new Date('2026-11-14T12:00:00.000Z');

    await expect(repository.listPublished(now)).resolves.toEqual([]);

    expect(prisma.vacante.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          estado: { in: expect.arrayContaining(['PUBLICADO']) },
          OR: [{ fecha_cierre: null }, { fecha_cierre: { gt: now } }],
        },
        orderBy: [
          { fecha_publicacion: 'desc' },
          { created_at: 'desc' },
          { id: 'asc' },
        ],
      }),
    );
  });
});
