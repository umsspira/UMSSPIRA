import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { PrismaSurveyRepository } from './prisma-survey.repository';

function createPrisma() {
  return {
    titulado: { findMany: jest.fn() },
    respuestaEncuesta: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

describe('PrismaSurveyRepository.getSurveyReport', () => {
  it('devuelve un reporte vacío si el administrador no tiene carreras', async () => {
    const prisma = createPrisma();
    const repository = new PrismaSurveyRepository(prisma as unknown as PrismaService);

    const result = await repository.getSurveyReport({ careerIds: [] });

    expect(result.total).toBe(0);
    expect(result.respuestas).toEqual([]);
    expect(result.pagination).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
    expect(prisma.titulado.findMany).not.toHaveBeenCalled();
  });

  it('devuelve un reporte vacío si la carrera no tiene titulados', async () => {
    const prisma = createPrisma();
    prisma.titulado.findMany.mockResolvedValue([]);
    const repository = new PrismaSurveyRepository(prisma as unknown as PrismaService);

    const result = await repository.getSurveyReport({ careerIds: ['career-1'], page: 2, limit: 5 });

    expect(result.total).toBe(0);
    expect(result.pagination).toEqual({ page: 2, limit: 5, total: 0, totalPages: 0 });
    expect(prisma.respuestaEncuesta.count).not.toHaveBeenCalled();
  });

  it('calcula totales y agrupaciones en la base de datos y pagina el detalle', async () => {
    const prisma = createPrisma();
    prisma.titulado.findMany.mockResolvedValue([{ id: 'tit-1' }, { id: 'tit-2' }, { id: 'tit-3' }]);
    prisma.respuestaEncuesta.count.mockResolvedValue(3);
    prisma.respuestaEncuesta.groupBy
      .mockResolvedValueOnce([
        { condicionLaboral: 'true', _count: { _all: 1 } },
        { condicionLaboral: ' Trabaja ', _count: { _all: 1 } },
        { condicionLaboral: 'false', _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        { modalidad: 'Remoto', _count: { _all: 2 } },
        { modalidad: null, _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        { salarioMensual: '3.000–5.000', _count: { _all: 2 } },
        { salarioMensual: null, _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        { tiempoInsercion: '3', _count: { _all: 2 } },
        { tiempoInsercion: null, _count: { _all: 1 } },
      ]);
    prisma.respuestaEncuesta.findMany.mockResolvedValue([
      {
        id: 'resp-1',
        condicionLaboral: 'true',
        cargo: 'Analista',
        empresa: 'Empresa',
        area: 'Sistemas',
        modalidad: 'Remoto',
        salarioMensual: '3.000–5.000',
        tiempoInsercion: '3',
        fechaEnvio: new Date('2026-11-10T12:00:00.000Z'),
      },
      {
        id: 'resp-2',
        condicionLaboral: 'false',
        cargo: null,
        empresa: null,
        area: null,
        modalidad: null,
        salarioMensual: null,
        tiempoInsercion: null,
        fechaEnvio: new Date('2026-11-09T12:00:00.000Z'),
      },
    ]);
    const repository = new PrismaSurveyRepository(prisma as unknown as PrismaService);

    const result = await repository.getSurveyReport({ careerIds: ['career-1'], page: 2, limit: 2 });

    expect(prisma.titulado.findMany).toHaveBeenCalledWith({
      where: { id_carrera: { in: ['career-1'] } },
      select: { id: true },
    });
    expect(prisma.respuestaEncuesta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2, take: 2, orderBy: { fechaEnvio: 'desc' } }),
    );
    expect(result).toMatchObject({
      total: 3,
      trabajan: 2,
      noTrabajan: 1,
      porModalidad: { Remoto: 2 },
      porSalario: { '3.000–5.000': 2 },
      porInsercion: { '3': 2 },
      pagination: { page: 2, limit: 2, total: 3, totalPages: 2 },
    });
    expect(result.respuestas).toEqual([
      expect.objectContaining({
        id: 'resp-1',
        condicionLaboral: 'Trabaja',
        fechaEnvio: '2026-11-10T12:00:00.000Z',
      }),
      expect.objectContaining({ id: 'resp-2', condicionLaboral: 'No trabaja' }),
    ]);
  });

  it('usa página 1 y 10 registros si los parámetros no son válidos', async () => {
    const prisma = createPrisma();
    prisma.titulado.findMany.mockResolvedValue([]);
    const repository = new PrismaSurveyRepository(prisma as unknown as PrismaService);

    const result = await repository.getSurveyReport({
      careerIds: ['career-1'],
      page: 0,
      limit: -5,
    });

    expect(result.pagination).toMatchObject({ page: 1, limit: 10 });
  });
});