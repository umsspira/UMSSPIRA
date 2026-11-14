import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { GetAccreditationDashboardUseCase } from '../../application/use-cases/get-accreditation-dashboard.use-case';
import { PrismaReportRepository } from './prisma-report.repository';

type Response = {
  id: string;
  idEncuesta: string;
  idTitulado: string;
  condicionLaboral: string;
  salarioMensual: string | null;
  tiempoInsercion: string | null;
  fechaEnvio: Date;
};

function graduates(cohort: number, count: number, prefix: string) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    id_carrera: 'career-1',
    anio_egreso: cohort,
  }));
}

function answer(
  idTitulado: string,
  works: boolean,
  salary = '3.000–5.000',
  months = '4',
  fechaEnvio = new Date('2026-11-10T12:00:00Z'),
): Response {
  return {
    id: `r-${idTitulado}`,
    idEncuesta: 'survey-published',
    idTitulado,
    condicionLaboral: works ? 'true' : 'false',
    salarioMensual: works ? salary : null,
    tiempoInsercion: works ? months : null,
    fechaEnvio,
  };
}

function repositoryWith(options: {
  surveys?: Array<{ id: string; id_carrera: string }>;
  answeredSurveyIds?: string[];
  graduates?: Array<{ id: string; id_carrera: string; anio_egreso: number | null }>;
  responses?: Response[];
}) {
  const prisma = {
    encuesta: {
      findMany: jest.fn().mockResolvedValue(
        options.surveys ?? [
          { id: 'survey-draft', id_carrera: 'career-1' },
          { id: 'survey-published', id_carrera: 'career-1' },
        ],
      ),
    },
    respuestaEncuesta: {
      groupBy: jest
        .fn()
        .mockResolvedValue(
          (options.answeredSurveyIds ?? ['survey-published']).map((idEncuesta) => ({ idEncuesta })),
        ),
      findMany: jest.fn().mockResolvedValue(options.responses ?? []),
    },
    titulado: { findMany: jest.fn().mockResolvedValue(options.graduates ?? []) },
  };
  return { repository: new PrismaReportRepository(prisma as never), prisma };
}

describe('PrismaReportRepository.accreditationDashboard (T1.1)', () => {
  // Cohorte 2021: 6 respuestas, 4 trabajan. Cohorte 2023: 4 respuestas, 3 trabajan.
  const cohort2021 = graduates(2021, 6, 'g21');
  const cohort2023 = graduates(2023, 4, 'g23');
  const responses = [
    answer('g21-0', true, '3.000–5.000', '3'),
    answer('g21-1', true, '5.001–8.000', '6'),
    answer('g21-2', true, '5.001–8.000', '4'),
    answer('g21-3', true, '12.001–21.000', '9'),
    answer('g21-4', false),
    answer('g21-5', false),
    answer('g23-0', true, '0–2.999', '2'),
    answer('g23-1', true, '8.001–12.000', '5'),
    answer('g23-2', true, '3.000–5.000', '1'),
    answer('g23-3', false),
  ];

  it('calcula el total, el porcentaje de empleados y el promedio de inserción (CA-01)', async () => {
    const { repository } = repositoryWith({ graduates: [...cohort2021, ...cohort2023], responses });
    const result = await repository.accreditationDashboard(['career-1']);

    expect(result.totalResponses).toBe(10);
    expect(result.employedGraduates).toBe(7);
    expect(result.employedPercentage).toBe(70);
    // (3 + 6 + 4 + 9 + 2 + 5 + 1) / 7 = 4,29 → 4,3, solo de los que trabajan.
    expect(result.averageInsertionMonths).toBe(4.3);
  });

  it('cuenta a los que trabajan en cada uno de los 5 rangos de salario (CA-02)', async () => {
    const { repository } = repositoryWith({ graduates: [...cohort2021, ...cohort2023], responses });
    const result = await repository.accreditationDashboard(['career-1']);

    expect(result.salaryRanges).toEqual({
      '0–2.999': 1,
      '3.000–5.000': 2,
      '5.001–8.000': 2,
      '8.001–12.000': 1,
      '12.001–21.000': 1,
    });
  });

  it('una cohorte con 4 respuestas sale sin cantidad ni porcentaje (CA-03 y CA-04)', async () => {
    const { repository } = repositoryWith({ graduates: [...cohort2021, ...cohort2023], responses });
    const result = await repository.accreditationDashboard(['career-1']);

    expect(result.employabilityByCohort).toEqual([
      {
        cohort: 2021,
        status: 'ok',
        totalResponses: 6,
        employedGraduates: 4,
        employedPercentage: 67,
      },
      { cohort: 2023, status: 'insufficient' },
    ]);
  });

  it('una encuesta nueva en borrador y sin respuestas no deja el tablero en 0', async () => {
    const { repository, prisma } = repositoryWith({
      graduates: [...cohort2021, ...cohort2023],
      responses,
    });
    const result = await repository.accreditationDashboard(['career-1']);

    expect(result.totalResponses).toBe(10);
    expect(prisma.respuestaEncuesta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ idEncuesta: { in: ['survey-published'] } }),
      }),
    );
  });

  it('devuelve las cohortes y semestres disponibles ordenados (CA-01 y CA-02)', async () => {
    const responsesWithDates = [
      answer('g21-0', true, '3.000–5.000', '3', new Date('2026-03-10T12:00:00Z')),
      answer('g23-0', true, '0–2.999', '2', new Date('2026-10-15T12:00:00Z')),
      answer('g23-1', true, '8.001–12.000', '5', new Date('2025-05-20T12:00:00Z')),
    ];
    const { repository } = repositoryWith({
      graduates: [cohort2021[0], cohort2023[0], cohort2023[1]],
      responses: responsesWithDates,
    });
    const result = await repository.accreditationDashboard(['career-1']);

    expect(result.availableCohorts).toEqual([2021, 2023]);
    expect(result.availableSemesters).toEqual(['2/2026', '1/2026', '1/2025']);
  });

  it('filtra el tablero por cohorte recalculando indicadores y gráfico (CA-03)', async () => {
    const { repository } = repositoryWith({ graduates: [...cohort2021, ...cohort2023], responses });
    const result = await repository.accreditationDashboard(['career-1'], { cohort: 2021 });

    expect(result.totalResponses).toBe(6);
    expect(result.employedGraduates).toBe(4);
    expect(result.employedPercentage).toBe(67);
    expect(result.employabilityByCohort).toEqual([
      {
        cohort: 2021,
        status: 'ok',
        totalResponses: 6,
        employedGraduates: 4,
        employedPercentage: 67,
      },
    ]);
    expect(result.availableCohorts).toEqual([2021, 2023]);
  });

  it('filtra el tablero por semestre de envío recalculando indicadores y gráfico (CA-04)', async () => {
    const mixedResponses = [
      answer('g21-0', true, '3.000–5.000', '3', new Date('2026-02-10T12:00:00Z')),
      answer('g21-1', true, '5.001–8.000', '6', new Date('2026-03-10T12:00:00Z')),
      answer('g21-2', true, '5.001–8.000', '4', new Date('2026-08-10T12:00:00Z')),
      answer('g23-0', true, '0–2.999', '2', new Date('2026-02-15T12:00:00Z')),
    ];
    const { repository } = repositoryWith({
      graduates: [cohort2021[0], cohort2021[1], cohort2021[2], cohort2023[0]],
      responses: mixedResponses,
    });
    const result = await repository.accreditationDashboard(['career-1'], { semester: '1/2026' });

    expect(result.totalResponses).toBe(3);
    expect(result.employedGraduates).toBe(3);
    expect(result.employedPercentage).toBe(100);
    expect(result.availableSemesters).toEqual(['2/2026', '1/2026']);
  });

  it('si el periodo filtrado no tiene datos, devuelve valores en cero y mantiene periodos disponibles (CA-08)', async () => {
    const { repository } = repositoryWith({ graduates: [...cohort2021, ...cohort2023], responses });
    const result = await repository.accreditationDashboard(['career-1'], { cohort: 2099 });

    expect(result.totalResponses).toBe(0);
    expect(result.employedGraduates).toBe(0);
    expect(result.employedPercentage).toBe(0);
    expect(result.averageInsertionMonths).toBeNull();
    expect(result.employabilityByCohort).toEqual([]);
    expect(result.availableCohorts).toEqual([2021, 2023]);
  });

  it('sin encuestas respondidas devuelve el tablero vacío', async () => {
    const { repository } = repositoryWith({ answeredSurveyIds: [] });
    const result = await repository.accreditationDashboard(['career-1']);

    expect(result.totalResponses).toBe(0);
    expect(result.averageInsertionMonths).toBeNull();
    expect(result.employabilityByCohort).toEqual([]);
  });

  it('consulta solo las encuestas y los titulados de las carreras permitidas (CA-10)', async () => {
    const { repository, prisma } = repositoryWith({ graduates: cohort2021, responses });
    await repository.accreditationDashboard(['career-1']);

    expect(prisma.encuesta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_carrera: { in: ['career-1'] } } }),
    );
    expect(prisma.titulado.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_carrera: { in: ['career-1'] } } }),
    );
  });
});

describe('GetAccreditationDashboardUseCase (CA-10)', () => {
  function actor(careerIds: string[]): ActorContext {
    return {
      id: 'admin',
      email: 'admin@example.com',
      name: 'Administrador',
      role: 'administrador',
      permissions: ['reportes:read'],
      scopes: { companyIds: [], graduateId: null, careerIds },
      credentialVersion: 1,
    };
  }

  it('lee solo las carreras del administrador', async () => {
    const accreditationDashboard = jest.fn().mockResolvedValue({});
    await new GetAccreditationDashboardUseCase({ accreditationDashboard } as never).execute(
      actor(['career-1', 'career-2']),
    );
    expect(accreditationDashboard).toHaveBeenCalledWith(['career-1', 'career-2']);
  });

  it('pasa los filtros de cohorte y semestre al repositorio', async () => {
    const accreditationDashboard = jest.fn().mockResolvedValue({});
    await new GetAccreditationDashboardUseCase({ accreditationDashboard } as never).execute(
      actor(['career-1']),
      'career-1',
      { cohort: 2023, semester: '2/2026' },
    );
    expect(accreditationDashboard).toHaveBeenCalledWith(['career-1'], {
      cohort: 2023,
      semester: '2/2026',
    });
  });

  it('rechaza una carrera que no es del administrador', async () => {
    const accreditationDashboard = jest.fn();
    await expect(
      new GetAccreditationDashboardUseCase({ accreditationDashboard } as never).execute(
        actor(['career-1']),
        'career-2',
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(accreditationDashboard).not.toHaveBeenCalled();
  });
});

describe('Filtros de cohorte y semestre en los indicadores (HU-003 / HU-004 CA-04)', () => {
  // 6 titulados de 2021 y 5 de 2023. Los de 2023 respondieron en el semestre 1/2026.
  const people = [...graduates(2021, 6, 'a'), ...graduates(2023, 5, 'b')];
  const answers = [
    ...graduates(2021, 6, 'a').map((g) => answer(g.id, true)),
    ...graduates(2023, 5, 'b').map((g) => ({
      ...answer(g.id, false),
      fechaEnvio: new Date('2026-03-10T12:00:00Z'),
    })),
  ];

  it('con una cohorte elegida solo cuenta esa cohorte y conserva todas las opciones', async () => {
    const { repository } = repositoryWith({ graduates: people, responses: answers });
    const result = await repository.accreditationDashboard(['career-1'], { cohort: 2021 });

    expect(result.totalResponses).toBe(6);
    expect(result.employedPercentage).toBe(100);
    // HU-003 CA-01: el selector sigue mostrando todas las cohortes con datos.
    expect(result.availableCohorts).toEqual([2021, 2023]);
  });

  it('con un semestre elegido solo cuenta las encuestas enviadas en ese semestre', async () => {
    const { repository } = repositoryWith({ graduates: people, responses: answers });
    const result = await repository.accreditationDashboard(['career-1'], { semester: '1/2026' });

    expect(result.totalResponses).toBe(5);
    expect(result.employedPercentage).toBe(0);
    // HU-003 CA-02: el selector sigue mostrando todos los semestres con envíos.
    expect(result.availableSemesters).toEqual(['2/2026', '1/2026']);
  });
});
