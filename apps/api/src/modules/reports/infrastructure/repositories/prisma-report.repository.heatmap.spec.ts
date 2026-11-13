import { PrismaReportRepository } from './prisma-report.repository';

describe('PrismaReportRepository.competencyHeatmap', () => {
  it('usa solo el último radar de cada titulado', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'radar-new',
        id_titulado: 'graduate-1',
        fecha_calculo: new Date('2026-02-01T00:00:00Z'),
        titulado: { id: 'graduate-1', anio_egreso: 2025 },
        afinidad_registros: [
          { porcentaje: 90, area: { id: 'area-1', nombre: 'Tecnología' } },
        ],
      },
      {
        id: 'radar-old',
        id_titulado: 'graduate-1',
        fecha_calculo: new Date('2026-01-01T00:00:00Z'),
        titulado: { id: 'graduate-1', anio_egreso: 2025 },
        afinidad_registros: [
          { porcentaje: 10, area: { id: 'area-1', nombre: 'Tecnología' } },
        ],
      },
    ]);
    const repository = new PrismaReportRepository({ calculoRadar: { findMany } } as never);

    const result = await repository.competencyHeatmap(['career-1']);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { titulado: { id_carrera: { in: ['career-1'] } } },
        orderBy: [{ id_titulado: 'asc' }, { fecha_calculo: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(result.cells).toEqual([
      {
        cohort: '2025',
        areaId: 'area-1',
        areaName: 'Tecnología',
        graduateCount: 1,
        percentage: null,
      },
    ]);
  });

  it('promedia y expone el porcentaje cuando hay al menos cinco titulados', async () => {
    const findMany = jest.fn().mockResolvedValue(
      [80, 60, 100, 40, 70].map((percentage, index) => ({
        id: `radar-${index}`,
        id_titulado: `graduate-${index}`,
        fecha_calculo: new Date('2026-02-01T00:00:00Z'),
        titulado: { id: `graduate-${index}`, anio_egreso: 2025 },
        afinidad_registros: [
          { porcentaje: percentage, area: { id: 'area-1', nombre: 'Tecnología' } },
        ],
      })),
    );
    const repository = new PrismaReportRepository({ calculoRadar: { findMany } } as never);

    const result = await repository.competencyHeatmap(['career-1']);

    expect(result.cells[0]).toMatchObject({ graduateCount: 5, percentage: 70 });
  });
});
