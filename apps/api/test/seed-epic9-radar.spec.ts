import type { PrismaClient } from '../src/generated/prisma/client';
import { AFFINITY_AREAS } from '@umsspira/shared-types';
import { RADAR_AREA_IDS } from '../src/modules/radar/domain/entities/radar-area';
import { DEMO_CAREER_ID } from '../scripts/seed/demo-accounts';
import {
  demoGraduates,
  seedEpic9,
  systemsRadarAffinities,
  systemsRadarCalculations,
  systemsRadarGraduates,
} from '../scripts/seed/epic-9';

describe('Seed de radar para Ingeniería de Sistemas', () => {
  it('prepara cohortes grandes y pequeñas, con un área realmente ausente en la cohorte 2025', () => {
    const graduatesById = new Map(systemsRadarGraduates.map((graduate) => [graduate.id, graduate]));
    const cohortCounts = systemsRadarGraduates.reduce(
      (counts, graduate) => {
        const cohort = graduate.anio_egreso;
        if (cohort !== null && cohort !== undefined) {
          counts.set(cohort, (counts.get(cohort) ?? 0) + 1);
        }
        return counts;
      },
      new Map<number, number>(),
    );
    expect([...cohortCounts]).toEqual([
      [2021, 8],
      [2022, 8],
      [2023, 8],
      [2024, 8],
      [2025, 7],
      [2026, 3],
    ]);
    expect(systemsRadarGraduates.every(({ id_carrera }) => id_carrera === DEMO_CAREER_ID)).toBe(
      true,
    );
    expect(systemsRadarCalculations).toHaveLength(systemsRadarGraduates.length);
    expect(new Set(systemsRadarCalculations.map(({ id_titulado }) => id_titulado))).toEqual(
      new Set(systemsRadarGraduates.map(({ id }) => id)),
    );
    expect(new Set(systemsRadarCalculations.map(({ id }) => id)).size).toBe(
      systemsRadarCalculations.length,
    );
    expect(new Set(systemsRadarGraduates.map(({ id }) => id)).size).toBe(
      systemsRadarGraduates.length,
    );
    expect(
      systemsRadarGraduates.filter(({ id }) => !demoGraduates.some((graduate) => graduate.id === id)),
    ).toHaveLength(3);

    const cohort2025CalculationIds = new Set(
      systemsRadarCalculations
        .filter(({ id_titulado }) => graduatesById.get(id_titulado)?.anio_egreso === 2025)
        .map(({ id }) => id),
    );
    const countsByArea = new Map<string, number>();
    for (const affinity of systemsRadarAffinities) {
      if (cohort2025CalculationIds.has(affinity.id_calculo_radar)) {
        countsByArea.set(affinity.id_area, (countsByArea.get(affinity.id_area) ?? 0) + 1);
      }
    }

    expect(countsByArea.get(RADAR_AREA_IDS['data-ai']) ?? 0).toBe(0);
    expect(countsByArea.get(RADAR_AREA_IDS['software-development'])).toBe(7);
    expect(systemsRadarAffinities.length).toBeLessThan(
      systemsRadarCalculations.length * AFFINITY_AREAS.length,
    );
  });

  it('persiste titulados y cálculos con identificadores estables y omite duplicados al repetir la semilla', async () => {
    const database = {
      titulado: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      reporte: { createMany: jest.fn() },
      encuesta: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      respuestaEncuesta: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      calculoRadar: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      afinidadRadar: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    await seedEpic9(database as unknown as PrismaClient);
    await seedEpic9(database as unknown as PrismaClient);

    expect(database.titulado.createMany).toHaveBeenNthCalledWith(1, {
      data: systemsRadarGraduates,
      skipDuplicates: true,
    });
    expect(database.calculoRadar.createMany).toHaveBeenNthCalledWith(2, {
      data: systemsRadarCalculations,
      skipDuplicates: true,
    });
    expect(database.afinidadRadar.createMany).toHaveBeenNthCalledWith(2, {
      data: systemsRadarAffinities,
      skipDuplicates: true,
    });
  });
});
