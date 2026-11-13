import { ForbiddenException } from '@nestjs/common';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { SurveyRepositoryPort } from '../../application/ports/survey-repository.port';
import { GetSurveyReportController } from './get-survey-report.controller';

describe('GetSurveyReportController', () => {
  let controller: GetSurveyReportController;
  let repository: { getSurveyReport: jest.Mock };

  const adminActor: ActorContext = {
    id: 'admin-1',
    email: 'admin.sistemas@umss.edu.bo',
    name: 'Admin Carrera',
    role: 'administrador',
    permissions: ['reportes:read'],
    scopes: {
      companyIds: [],
      graduateId: null,
      careerIds: ['career-1'],
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

  it('agrupa las respuestas laborales de la carrera del administrador y conserva el detalle paginado', async () => {
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

    await expect(controller.handle(adminActor)).resolves.toEqual({
      data: mockReport,
    });
    expect(repository.getSurveyReport).toHaveBeenCalledWith({
      careerId: 'career-1',
      page: 1,
      limit: 10,
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

    await expect(controller.handle(adminActor)).resolves.toEqual({
      data: emptyReport,
    });
  });

  it('rechaza con 403 Forbidden si el administrador consulta otra carrera', async () => {
    await expect(
      controller.handle(adminActor, '1', '10', 'otra-carrera'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.getSurveyReport).not.toHaveBeenCalled();
  });
});