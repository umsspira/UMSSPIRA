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
