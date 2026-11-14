import { PrismaJobPostingRepository } from './prisma-job-posting.repository';

describe('PrismaJobPostingRepository.findPublishedById', () => {
  it('only selects published vacancies already released and not past closing date', async () => {
    const now = new Date('2026-11-14T12:00:00.000Z');
    const prisma = { vacante: { findFirst: jest.fn().mockResolvedValue(null) } };
    const repository = new PrismaJobPostingRepository(prisma as never);

    await repository.findPublishedById('vacancy-id', now);

    expect(prisma.vacante.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'vacancy-id',
        estado: { in: ['PUBLICADO', 'PUBLICADA', 'ACTIVA', 'ACTIVO', 'ACTIVE', 'PUBLISHED'] },
        AND: [
          { OR: [{ fecha_publicacion: null }, { fecha_publicacion: { lte: now } }] },
          { OR: [{ fecha_cierre: null }, { fecha_cierre: { gt: now } }] },
        ],
      },
    }));
  });
});
