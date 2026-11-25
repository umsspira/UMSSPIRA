/// <reference types="jest" />
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { UpdateMySurveyUseCase } from '../../application/use-cases/update-my-survey.use-case';
import { UpdateMySurveyController } from './update-my-survey.controller';

describe('UpdateMySurveyController (HU-6 T6.1)', () => {
  const surveyId = '123e4567-e89b-12d3-a456-426614174000';
  const graduateId = '123e4567-e89b-12d3-a456-426614174111';

  const actor: ActorContext = {
    id: '123e4567-e89b-12d3-a456-426614174222',
    email: 'titulado@umss.edu.bo',
    name: 'Titulado Prueba',
    role: 'titulado',
    permissions: [],
    scopes: { companyIds: [], graduateId, careerIds: [] },
    credentialVersion: 1,
  };

  const validBody = {
    id_encuesta: surveyId,
    condicion_laboral: true,
    cargo: 'Analista',
    empresa: 'UMSS',
    area: 'Sistemas',
    modalidad: 'Remoto',
    salario_mensual: '3.000–5.000',
    tiempo_insercion: '3',
  };

  let useCase: { execute: jest.Mock };
  let controller: UpdateMySurveyController;

  beforeEach(() => {
    useCase = { execute: jest.fn() };
    controller = new UpdateMySurveyController(useCase as unknown as UpdateMySurveyUseCase);
  });

  it('guarda la única edición y devuelve la fecha de actualización', async () => {
    const fecha = new Date('2026-11-20T15:00:00.000Z');
    useCase.execute.mockResolvedValue({ id: 'respuesta-1', edicionUsada: true, fechaActualizacion: fecha });

    await expect(controller.update(actor, validBody)).resolves.toEqual({
      data: { id: 'respuesta-1', edicion_usada: true, fecha_actualizacion: fecha.toISOString() },
    });
    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        idEncuesta: surveyId,
        idTitulado: graduateId,
        condicionLaboral: true,
        cargo: 'Analista',
        tiempoInsercion: '3',
      }),
    );
  });

  it('sin id_encuesta usa la encuesta vigente y acepta una fecha nula', async () => {
    useCase.execute.mockResolvedValue({ id: 'respuesta-1', edicionUsada: true, fechaActualizacion: null });
    const sinEncuesta: Partial<typeof validBody> = { ...validBody };
    delete sinEncuesta.id_encuesta;

    await expect(controller.update(actor, sinEncuesta)).resolves.toEqual({
      data: { id: 'respuesta-1', edicion_usada: true, fecha_actualizacion: null },
    });
    expect(useCase.execute).toHaveBeenCalledWith(expect.objectContaining({ idEncuesta: '' }));
  });

  it('rechaza datos inválidos con 400 sin llamar al caso de uso', async () => {
    await expect(controller.update(actor, { condicion_laboral: 'si' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('responde 404 si la cuenta no tiene perfil de titulado', async () => {
    const sinPerfil: ActorContext = { ...actor, scopes: { ...actor.scopes, graduateId: null } };

    await expect(controller.update(sinPerfil, validBody)).rejects.toBeInstanceOf(NotFoundException);
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it.each(['SURVEY_EDIT_ALREADY_USED', 'SURVEY_EDIT_UNAVAILABLE'])(
    'traduce %s a 409 (CA-09: la edición ya se usó en otra pestaña)',
    async (code) => {
      useCase.execute.mockRejectedValue(new BusinessRuleError('conflict', code, 'Ya utilizaste tu única edición'));

      await expect(controller.update(actor, validBody)).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it.each(['SURVEY_NOT_ACTIVE', 'SURVEY_RESPONSE_NOT_FOUND'])('traduce %s a 404', async (code) => {
    useCase.execute.mockRejectedValue(new BusinessRuleError('missing', code, 'No existe una encuesta vigente'));

    await expect(controller.update(actor, validBody)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deja pasar otros errores de regla de negocio sin cambiarlos', async () => {
    const error = new BusinessRuleError('invalid', 'OTRO_ERROR', 'Otro error');
    useCase.execute.mockRejectedValue(error);

    await expect(controller.update(actor, validBody)).rejects.toBe(error);
  });

  it('deja pasar los errores inesperados', async () => {
    const error = new Error('db caida');
    useCase.execute.mockRejectedValue(error);

    await expect(controller.update(actor, validBody)).rejects.toBe(error);
  });
});
