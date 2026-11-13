import { PrismaReportRepository } from './prisma-report.repository';
import { RADAR_AREA_IDS } from '@umsspira/shared-types';

describe('PrismaReportRepository.competencyHeatmap', () => {
  it('usa solo el último radar de cada titulado', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'radar-new',
        id_titulado: 'graduate-1',
        fecha_calculo: new Date('2026-02-01T00:00:00Z'),
        titulado: { id: 'graduate-1', anio_egreso: 2025 },
        afinidad_registros: [
          {
            porcentaje: 90,
            area: { id: RADAR_AREA_IDS['software-development'], nombre: 'Desarrollo de Software' },
          },
        ],
      },
      {
        id: 'radar-old',
        id_titulado: 'graduate-1',
        fecha_calculo: new Date('2026-01-01T00:00:00Z'),
        titulado: { id: 'graduate-1', anio_egreso: 2025 },
        afinidad_registros: [
          {
            porcentaje: 10,
            area: { id: RADAR_AREA_IDS['software-development'], nombre: 'Desarrollo de Software' },
          },
        ],
      },
    ]);
    const repository = new PrismaReportRepository({ calculoRadar: { findMany } } as never);

    const result = await repository.competencyHeatmap(['career-1']);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          titulado: {
            id_carrera: { in: ['career-1'] },
            anio_egreso: { not: null },
          },
        },
        orderBy: [{ id_titulado: 'asc' }, { fecha_calculo: 'desc' }, { id: 'desc' }],
        distinct: ['id_titulado'],
      }),
    );
    expect(result.cells).toHaveLength(6);
    expect(result.cells.find((cell) => cell.areaId === RADAR_AREA_IDS['software-development'])).toEqual({
      cohort: '2025',
      areaId: RADAR_AREA_IDS['software-development'],
      areaName: 'Desarrollo de Software',
      status: 'insufficient',
    });
    expect(result.updatedAt).toEqual(new Date('2026-02-01T00:00:00Z'));
  });

  it('promedia y expone el porcentaje cuando hay al menos cinco titulados', async () => {
    const findMany = jest.fn().mockResolvedValue(
      [80, 60, 100, 40, 70].map((percentage, index) => ({
        id: `radar-${index}`,
        id_titulado: `graduate-${index}`,
        fecha_calculo: new Date('2026-02-01T00:00:00Z'),
        titulado: { id: `graduate-${index}`, anio_egreso: 2025 },
        afinidad_registros: [
          {
            porcentaje: percentage,
            area: { id: RADAR_AREA_IDS['software-development'], nombre: 'Desarrollo de Software' },
          },
        ],
      })),
    );
    const repository = new PrismaReportRepository({ calculoRadar: { findMany } } as never);

    const result = await repository.competencyHeatmap(['career-1']);

    expect(result.cells.find((cell) => cell.areaId === RADAR_AREA_IDS['software-development'])).toMatchObject({
      graduateCount: 5,
      percentage: 70,
      status: 'ok',
    });
    expect(result.areas).toHaveLength(6);
  });
});
