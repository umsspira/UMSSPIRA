import type { PrismaClient } from '../src/generated/prisma/client';
import { AFFINITY_AREAS } from '@umsspira/shared-types';
import { RADAR_AREA_IDS } from '../src/modules/radar/domain/entities/radar-area';
import {
  DEMO_ACCOUNTS,
  DEMO_INFORMATICS_CAREER_ID,
  DEMO_INFORMATICS_QA_ADMIN_ASSIGNMENT_ID,
  DEMO_INFORMATICS_QA_ADMIN_ID,
} from '../scripts/seed/demo-accounts';
import {
  qaSecondCareerGraduates,
  qaSecondCareerRadarAffinities,
  qaSecondCareerRadarCalculations,
  qaSecondCareerResponses,
  qaSecondCareerSurvey,
  seedQaSecondCareer,
} from '../scripts/seed/qa-second-career';
import { seedInformaticsCareer } from '../scripts/seed/informatics-career';

jest.mock('../scripts/seed/informatics-career', () => ({
  seedInformaticsCareer: jest.fn().mockResolvedValue('10000000-0000-4000-8000-000000000002'),
}));

describe('Seed QA de la segunda carrera', () => {
  it('mantiene un administrador dedicado y prepara rangos laborales y cohortes representativos', () => {
    const admin = DEMO_ACCOUNTS.find((account) => account.id === DEMO_INFORMATICS_QA_ADMIN_ID);
    expect(admin).toMatchObject({
      role: 'administrador',
      profileId: DEMO_INFORMATICS_QA_ADMIN_ASSIGNMENT_ID,
      careerId: DEMO_INFORMATICS_CAREER_ID,
    });

    expect(qaSecondCareerGraduates).toHaveLength(20);
    expect(new Set(qaSecondCareerGraduates.map(({ id }) => id)).size).toBe(20);
    expect(
      qaSecondCareerGraduates.every(({ id_carrera }) => id_carrera === DEMO_INFORMATICS_CAREER_ID),
    ).toBe(true);
    expect(qaSecondCareerSurvey[0]).toMatchObject({
      id_carrera: DEMO_INFORMATICS_CAREER_ID,
      id_administrador: DEMO_INFORMATICS_QA_ADMIN_ASSIGNMENT_ID,
    });
    expect(qaSecondCareerResponses.map(({ idTitulado }) => idTitulado)).toEqual(
      qaSecondCareerGraduates.map(({ id }) => id),
    );
    const sentAt = qaSecondCareerResponses.map(({ fechaEnvio }) => {
      if (!(fechaEnvio instanceof Date)) {
        throw new Error('Las respuestas de QA deben tener una fecha de envío');
      }
      return fechaEnvio.getTime();
    });
    expect(new Set(sentAt).size).toBe(qaSecondCareerResponses.length);

    const cohortCounts = new Map<number, number>();
    for (const graduate of qaSecondCareerGraduates) {
      const cohort = graduate.anio_egreso;
      if (cohort !== null && cohort !== undefined) {
        cohortCounts.set(cohort, (cohortCounts.get(cohort) ?? 0) + 1);
      }
    }
    expect([...cohortCounts]).toEqual([
      [2021, 4],
      [2022, 5],
      [2023, 6],
      [2024, 5],
    ]);

    const responsesByCondition = qaSecondCareerResponses.reduce(
      (counts, response) => {
        counts[String(response.condicionLaboral)] += 1;
        return counts;
      },
      { true: 0, false: 0 } as Record<string, number>,
    );
    expect(responsesByCondition).toEqual({ true: 15, false: 5 });

    const salaryCounts = qaSecondCareerResponses.reduce(
      (counts, response) => {
        if (response.salarioMensual) {
          counts[response.salarioMensual] = (counts[response.salarioMensual] ?? 0) + 1;
        }
        return counts;
      },
      {} as Record<string, number>,
    );
    expect(salaryCounts).toEqual({
      '0–2.999': 3,
      '3.000–5.000': 3,
      '5.001–8.000': 3,
      '8.001–12.000': 3,
      '12.001–21.000': 3,
    });
    expect(
      qaSecondCareerResponses
        .filter(({ condicionLaboral }) => condicionLaboral === false)
        .every(
          (response) =>
            response.cargo === undefined &&
            response.empresa === undefined &&
            response.salarioMensual === undefined &&
            response.tiempoInsercion === undefined,
        ),
    ).toBe(true);
    expect(qaSecondCareerResponses.every(({ fechaEnvio }) => fechaEnvio instanceof Date)).toBe(
      true,
    );
  });

  it('genera cálculos completos usando las seis áreas y el catálogo de afinidad del radar', () => {
    expect(qaSecondCareerSurvey).toHaveLength(1);
    expect(qaSecondCareerRadarCalculations).toHaveLength(qaSecondCareerGraduates.length);
    expect(qaSecondCareerRadarAffinities).toHaveLength(
      qaSecondCareerGraduates.length * AFFINITY_AREAS.length,
    );

    for (const calculation of qaSecondCareerRadarCalculations) {
      const affinities = qaSecondCareerRadarAffinities.filter(
        ({ id_calculo_radar }) => id_calculo_radar === calculation.id,
      );
      expect(affinities.map(({ id_area }) => id_area).sort()).toEqual(
        AFFINITY_AREAS.map((area) => RADAR_AREA_IDS[area]).sort(),
      );
      expect(
        affinities.every(({ porcentaje }) => Number(porcentaje) >= 0 && Number(porcentaje) <= 100),
      ).toBe(true);
      expect(affinities.every(({ palabras_clave_top }) => Array.isArray(palabras_clave_top))).toBe(
        true,
      );
    }
  });

  it('inserta registros en orden y evita duplicados con identificadores estables', async () => {
    const database = {
      carrera: { findUnique: jest.fn().mockResolvedValue({ id: DEMO_INFORMATICS_CAREER_ID }) },
      usuario: { findUnique: jest.fn().mockResolvedValue({ rol: 'administrador' }) },
      administradorDeCarrera: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: DEMO_INFORMATICS_QA_ADMIN_ASSIGNMENT_ID,
            id_carrera: DEMO_INFORMATICS_CAREER_ID,
          },
        ]),
      },
      titulado: { createMany: jest.fn().mockResolvedValue({ count: 20 }) },
      encuesta: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      respuestaEncuesta: { createMany: jest.fn().mockResolvedValue({ count: 20 }) },
      calculoRadar: { createMany: jest.fn().mockResolvedValue({ count: 20 }) },
      afinidadRadar: { createMany: jest.fn().mockResolvedValue({ count: 120 }) },
    };

    await seedQaSecondCareer(database as unknown as PrismaClient);

    expect(database.titulado.createMany).toHaveBeenCalledWith({
      data: qaSecondCareerGraduates,
      skipDuplicates: true,
    });
    expect(database.encuesta.createMany).toHaveBeenCalledWith({
      data: qaSecondCareerSurvey,
      skipDuplicates: true,
    });
    expect(database.respuestaEncuesta.createMany).toHaveBeenCalledWith({
      data: qaSecondCareerResponses,
      skipDuplicates: true,
    });
    expect(database.calculoRadar.createMany).toHaveBeenCalledWith({
      data: qaSecondCareerRadarCalculations,
      skipDuplicates: true,
    });
    expect(database.afinidadRadar.createMany).toHaveBeenCalledWith({
      data: qaSecondCareerRadarAffinities,
      skipDuplicates: true,
    });
  });

  it('conserva el UUID existente cuando Ingeniería Informática usa otro identificador', async () => {
    const careerId = '10000000-0000-4000-8000-000000000008';
    jest.mocked(seedInformaticsCareer).mockResolvedValueOnce(careerId);
    const database = {
      carrera: { findUnique: jest.fn().mockResolvedValue({ id: careerId }) },
      usuario: { findUnique: jest.fn().mockResolvedValue({ rol: 'administrador' }) },
      administradorDeCarrera: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: DEMO_INFORMATICS_QA_ADMIN_ASSIGNMENT_ID, id_carrera: careerId },
          ]),
      },
      titulado: { createMany: jest.fn().mockResolvedValue({ count: 20 }) },
      encuesta: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      respuestaEncuesta: { createMany: jest.fn().mockResolvedValue({ count: 20 }) },
      calculoRadar: { createMany: jest.fn().mockResolvedValue({ count: 20 }) },
      afinidadRadar: { createMany: jest.fn().mockResolvedValue({ count: 120 }) },
    };

    await seedQaSecondCareer(database as unknown as PrismaClient);

    expect(database.titulado.createMany).toHaveBeenCalledWith({
      data: qaSecondCareerGraduates.map((graduate) => ({ ...graduate, id_carrera: careerId })),
      skipDuplicates: true,
    });
    expect(database.encuesta.createMany).toHaveBeenCalledWith({
      data: qaSecondCareerSurvey.map((survey) => ({ ...survey, id_carrera: careerId })),
      skipDuplicates: true,
    });
  });

  it('no carga datos si la cuenta dedicada tiene otra asignación de carrera', async () => {
    const database = {
      carrera: { findUnique: jest.fn().mockResolvedValue({ id: DEMO_INFORMATICS_CAREER_ID }) },
      usuario: { findUnique: jest.fn().mockResolvedValue({ rol: 'administrador' }) },
      administradorDeCarrera: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: DEMO_INFORMATICS_QA_ADMIN_ASSIGNMENT_ID,
            id_carrera: DEMO_INFORMATICS_CAREER_ID,
          },
          { id: '10000000-0000-4000-8000-000000000007', id_carrera: 'otra-carrera' },
        ]),
      },
      titulado: { createMany: jest.fn() },
      encuesta: { createMany: jest.fn() },
      respuestaEncuesta: { createMany: jest.fn() },
      calculoRadar: { createMany: jest.fn() },
      afinidadRadar: { createMany: jest.fn() },
    };

    await expect(seedQaSecondCareer(database as unknown as PrismaClient)).rejects.toThrow(
      'únicamente a Ingeniería Informática',
    );
    expect(database.titulado.createMany).not.toHaveBeenCalled();
  });
});
