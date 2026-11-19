import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { SurveyRepositoryPort } from '../../application/ports/survey-repository.port';
import {
  GetSurveyReportController,
  surveyReportQuerySchema,
} from './get-survey-report.controller';

describe('GetSurveyReportController', () => {
  let controller: GetSurveyReportController;
  let repository: { getSurveyReport: jest.Mock };

  const careerId1 = '11111111-1111-4111-8111-111111111111';
  const careerId2 = '22222222-2222-4222-8222-222222222222';
  const otherCareerId = '33333333-3333-4333-8333-333333333333';

  const adminActor: ActorContext = {
    id: 'admin-1',
    email: 'admin.sistemas@umss.edu.bo',
    name: 'Admin Carrera',
    role: 'administrador',
    permissions: ['reportes:read'],
    scopes: {
      companyIds: [],
      graduateId: null,
      careerIds: [careerId1, careerId2],
    },
    credentialVersion: 1,
  };

  beforeEach(() => {
    repository = {
      getSurveyReport: jest.fn(),
    };

    controller = new GetSurveyReportController(
      repository as unknown as SurveyRepositoryPort,
    );
  });

  it('agrupa las respuestas laborales de todas las carreras del administrador y conserva el detalle paginado', async () => {
    const mockReport = {
      total: 2,
      trabajan: 1,
      noTrabajan: 1,
      porModalidad: { Hibrido: 1 },
      porSalario: { '5.001–8.000': 1 },
      porInsercion: { '6': 1 },
      respuestas: [
        {
          id: 'response-1',
          condicionLaboral: 'Trabaja',
          cargo: 'Analista',
          empresa: 'UMSS',
          area: 'TI',
          modalidad: 'Hibrido',
          salarioMensual: '5.001–8.000',
          tiempoInsercion: '6',
          fechaEnvio: '2026-10-27T00:00:00.000Z',
        },
        {
          id: 'response-2',
          condicionLaboral: 'No trabaja',
          cargo: null,
          empresa: null,
          area: null,
          modalidad: null,
          salarioMensual: null,
          tiempoInsercion: null,
          fechaEnvio: '2026-10-26T00:00:00.000Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    };

    repository.getSurveyReport.mockResolvedValue(mockReport);

    await expect(
      controller.handle(adminActor, { page: 1, limit: 10 }),
    ).resolves.toEqual({
      data: mockReport,
    });
    expect(repository.getSurveyReport).toHaveBeenCalledWith({
      careerIds: [careerId1, careerId2],
      page: 1,
      limit: 10,
    });
  });

  it('filtra por una carrera específica autorizada cuando se envía careerId', async () => {
    repository.getSurveyReport.mockResolvedValue({
      total: 0,
      trabajan: 0,
      noTrabajan: 0,
      porModalidad: {},
      porSalario: {},
      porInsercion: {},
      respuestas: [],
      pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
    });

    await controller.handle(adminActor, {
      careerId: careerId2,
      page: 2,
      limit: 5,
    });

    expect(repository.getSurveyReport).toHaveBeenCalledWith({
      careerIds: [careerId2],
      page: 2,
      limit: 5,
    });
  });

  it('devuelve métricas vacías cuando aún no hay respuestas', async () => {
    const emptyReport = {
      total: 0,
      trabajan: 0,
      noTrabajan: 0,
      porModalidad: {},
      porSalario: {},
      porInsercion: {},
      respuestas: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };

    repository.getSurveyReport.mockResolvedValue(emptyReport);

    await expect(
      controller.handle(adminActor, { page: 1, limit: 10 }),
    ).resolves.toEqual({
      data: emptyReport,
    });
  });

  it('rechaza si el administrador consulta una carrera no autorizada', async () => {
    await expect(
      controller.handle(adminActor, {
        careerId: otherCareerId,
        page: 1,
        limit: 10,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(repository.getSurveyReport).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario no tiene carreras asignadas aunque envíe un careerId', async () => {
    const actorWithoutCareers: ActorContext = {
      ...adminActor,
      scopes: {
        ...adminActor.scopes,
        careerIds: [],
      },
    };

    await expect(
      controller.handle(actorWithoutCareers, {
        careerId: otherCareerId,
        page: 1,
        limit: 10,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(repository.getSurveyReport).not.toHaveBeenCalled();
  });

  it('valida los parámetros de consulta con Zod y rechaza un careerId inválido', () => {
    const pipe = new ZodValidationPipe(surveyReportQuerySchema);

    expect(() => pipe.transform({ careerId: 'id-no-valido' })).toThrow();
  });
});