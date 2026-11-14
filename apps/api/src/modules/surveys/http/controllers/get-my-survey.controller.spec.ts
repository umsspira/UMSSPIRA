/// <reference types="jest" />
import { NotFoundException } from '@nestjs/common';
import { GetMySurveyController } from './get-my-survey.controller';
import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { SurveyRepositoryPort } from '../../application/ports/survey-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

describe('GetMySurveyController', () => {
  let controller: GetMySurveyController;
  let repository: {
    save: jest.Mock;
    findActiveSurveyByCareer: jest.Mock;
    findActiveSurveyForGraduate: jest.Mock;
  };
  let prisma: {
    respuestaEncuesta: {
      findUnique: jest.Mock;
    };
  };

  const actor: ActorContext = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'titulado@umss.edu.bo',
    name: 'Titulado Prueba',
    role: 'titulado',
    permissions: [],
    scopes: {
      companyIds: [],
      graduateId: '123e4567-e89b-12d3-a456-426614174111',
      careerIds: [],
    },
    credentialVersion: 1,
  };

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findActiveSurveyByCareer: jest.fn(),
      findActiveSurveyForGraduate: jest.fn(),
    };
    prisma = {
      respuestaEncuesta: {
        findUnique: jest.fn(),
      },
    };

    controller = new GetMySurveyController(
      prisma as unknown as PrismaService,
      repository as unknown as SurveyRepositoryPort,
    );
  });

  it('devuelve responded: true y los datos guardados cuando existe respuesta', async () => {
    repository.findActiveSurveyForGraduate.mockResolvedValue({
      id: 'survey-active-1',
    });
    prisma.respuestaEncuesta.findUnique.mockResolvedValue({
      condicionLaboral: true,
      cargo: 'Tech Lead',
      empresa: 'UMSS Corp',
      area: 'Desarrollo',
      modalidad: 'Remoto',
      salarioMensual: '8.001–12.000',
      tiempoInsercion: '2',
    });

    const result = await controller.handle(actor);

    expect(repository.findActiveSurveyForGraduate).toHaveBeenCalledWith(
      actor.scopes.graduateId,
    );
    expect(result).toEqual({
      data: {
        responded: true,
        response: {
          condicion_laboral: true,
          cargo: 'Tech Lead',
          empresa: 'UMSS Corp',
          area: 'Desarrollo',
          modalidad: 'Remoto',
          salario_mensual: '8.001–12.000',
          tiempo_insercion: '2',
        },
      },
    });
  });

  it('devuelve responded: false y response: null si aún no ha respondido', async () => {
    repository.findActiveSurveyForGraduate.mockResolvedValue({
      id: 'survey-active-1',
    });
    prisma.respuestaEncuesta.findUnique.mockResolvedValue(null);

    const result = await controller.handle(actor);

    expect(result).toEqual({
      data: {
        responded: false,
        response: null,
      },
    });
  });

  it('lanza NotFoundException si no hay encuesta vigente para la carrera del titulado', async () => {
    repository.findActiveSurveyForGraduate.mockResolvedValue(null);

    await expect(controller.handle(actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lanza NotFoundException si el actor no tiene graduateId', async () => {
    await expect(
      controller.handle({
        ...actor,
        scopes: { ...actor.scopes, graduateId: null },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
