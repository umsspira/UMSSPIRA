import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { SubmitSurveyController } from './submit-survey.controller';

const actor: ActorContext = {
  id: 'user-1', email: 'titulado@umss.edu.bo', name: 'Titulado', role: 'titulado',
  permissions: [], scopes: { companyIds: [], graduateId: 'graduate-1', careerIds: [] }, credentialVersion: 1,
};

const workPayload = {
  condicion_laboral: true,
  cargo: 'Analista de sistemas', empresa: 'UMSS', area: 'Tecnologia', modalidad: 'Hibrido',
  salario_mensual: '5.001–8.000', tiempo_insercion: '6',
};

describe('SubmitSurveyController', () => {
  function makeController(overrides: { survey?: { id: string } | null; save?: jest.Mock } = {}) {
    const prisma = { encuesta: { findFirst: jest.fn().mockResolvedValue(overrides.survey ?? { id: 'survey-1' }), findUnique: jest.fn() } };
    const repository = { save: overrides.save ?? jest.fn().mockResolvedValue({ id: 'response-1' }) };
    return { controller: new SubmitSurveyController(prisma as never, repository), prisma, repository };
  }

  it('guarda la respuesta asociándola al titulado de la sesión', async () => {
    const { controller, repository } = makeController();

    await expect(controller.submit(actor, workPayload)).resolves.toEqual({ data: { id: 'response-1' } });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      idEncuesta: 'survey-1', idTitulado: 'graduate-1', condicionLaboral: true,
    }));
  });

  it('rechaza una sesión sin perfil de titulado', async () => {
    const { controller } = makeController();
    const actorWithoutGraduate = { ...actor, scopes: { ...actor.scopes, graduateId: null } };

    await expect(controller.submit(actorWithoutGraduate, { condicion_laboral: false }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('traduce un duplicado de base de datos a conflicto HTTP 409', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '7.10.1' });
    const { controller } = makeController({ save: jest.fn().mockRejectedValue(duplicate) });

    await expect(controller.submit(actor, workPayload)).rejects.toBeInstanceOf(ConflictException);
  });
});
