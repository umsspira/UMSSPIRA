import { NotFoundException } from '@nestjs/common';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { GetMySurveyController } from './get-my-survey.controller';

const actor = {
  scopes: { graduateId: 'graduate-A' },
} as unknown as ActorContext;

const createPrisma = () => ({
  encuesta: { findFirst: jest.fn().mockResolvedValue({ id: 'survey-latest' }) },
  respuestaEncuesta: { findUnique: jest.fn() },
});

describe('T3.4 GET /surveys/me — estado persistido por titulado', () => {
  it('retorna solo la respuesta de la encuesta reciente para el titulado autenticado', async () => {
    const prisma = createPrisma();
    prisma.respuestaEncuesta.findUnique.mockResolvedValue({
      condicionLaboral: 'true', cargo: 'Analista', empresa: 'UMSS',
      area: 'Sistemas', modalidad: 'Remoto', salarioMensual: '3.000–5.000',
      tiempoInsercion: '6',
    });
    const controller = new GetMySurveyController(prisma as never);
    await expect(controller.handle(actor)).resolves.toEqual({
      data: { responded: true, response: {
        condicion_laboral: true, cargo: 'Analista', empresa: 'UMSS',
        area: 'Sistemas', modalidad: 'Remoto', salario_mensual: '3.000–5.000',
        tiempo_insercion: '6',
      } },
    });
    expect(prisma.respuestaEncuesta.findUnique).toHaveBeenCalledWith({
      where: { uq_respuesta_encuesta_titulado: {
        idEncuesta: 'survey-latest', idTitulado: 'graduate-A',
      } },
    });
  });

  it('retorna no respondida cuando aún no existe registro', async () => {
    const prisma = createPrisma();
    prisma.respuestaEncuesta.findUnique.mockResolvedValue(null);
    const controller = new GetMySurveyController(prisma as never);
    await expect(controller.handle(actor)).resolves.toEqual({
      data: { responded: false, response: null },
    });
  });

  it('con No trabaja devuelve condición y no inventa campos', async () => {
    const prisma = createPrisma();
    prisma.respuestaEncuesta.findUnique.mockResolvedValue({
      condicionLaboral: 'false', cargo: null, empresa: null, area: null,
      modalidad: null, salarioMensual: null, tiempoInsercion: null,
    });
    const controller = new GetMySurveyController(prisma as never);
    await expect(controller.handle(actor)).resolves.toMatchObject({
      data: { responded: true, response: { condicion_laboral: false, cargo: null } },
    });
  });

  it('rechaza una identidad sin perfil de titulado', async () => {
    const prisma = createPrisma();
    const controller = new GetMySurveyController(prisma as never);
    await expect(controller.handle({ scopes: { graduateId: null } } as unknown as ActorContext))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.encuesta.findFirst).not.toHaveBeenCalled();
  });

  it('no habilita encuestas cuando no hay ninguna en el servidor', async () => {
    const prisma = createPrisma();
    prisma.encuesta.findFirst.mockResolvedValue(null);
    const controller = new GetMySurveyController(prisma as never);
    await expect(controller.handle(actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.respuestaEncuesta.findUnique).not.toHaveBeenCalled();
  });
});
