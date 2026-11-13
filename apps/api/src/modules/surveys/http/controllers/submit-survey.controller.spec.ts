/// <reference types="jest" />
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { SurveyRepositoryPort } from '../../application/ports/survey-repository.port';
import { SubmitSurveyController } from './submit-survey.controller';

describe('SubmitSurveyController', () => {
  let controller: SubmitSurveyController;
  let repository: {
    save: jest.Mock;
    findActiveSurveyByCareer: jest.Mock;
    findActiveSurveyForGraduate: jest.Mock;
  };
  let prisma: {
    respuestaEncuesta: {
      findFirst: jest.Mock;
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

  const validBody = {
    id_encuesta: '123e4567-e89b-12d3-a456-426614174000',
    condicion_laboral: true,
    cargo: 'Analista',
    empresa: 'UMSS',
    area: 'Sistemas',
    modalidad: 'Remoto',
    salario_mensual: '3.000–5.000',
    tiempo_insercion: '3',
  };

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findActiveSurveyByCareer: jest.fn(),
      findActiveSurveyForGraduate: jest.fn(),
    };
    prisma = {
      respuestaEncuesta: {
        findFirst: jest.fn(),
      },
    };

    controller = new SubmitSurveyController(
      prisma as unknown as PrismaService,
      repository as unknown as SurveyRepositoryPort,
    );
  });

  describe('getStatus', () => {
    it('informa si el titulado ya respondió la encuesta vigente', async () => {
      repository.findActiveSurveyForGraduate.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      prisma.respuestaEncuesta.findFirst.mockResolvedValue({ id: 'respuesta-existente' });

      await expect(controller.getStatus(actor)).resolves.toEqual({
        data: {
          submitted: true,
          hasActiveSurvey: true,
          surveyId: '123e4567-e89b-12d3-a456-426614174000',
        },
      });
      expect(repository.findActiveSurveyForGraduate).toHaveBeenCalledWith(
        actor.scopes.graduateId,
      );
      expect(prisma.respuestaEncuesta.findFirst).toHaveBeenCalledWith({
        where: {
          idEncuesta: '123e4567-e89b-12d3-a456-426614174000',
          idTitulado: actor.scopes.graduateId,
        },
        select: { id: true },
      });
    });

    it('informa que no hay respuesta si el titulado aún no envió la encuesta vigente', async () => {
      repository.findActiveSurveyForGraduate.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      prisma.respuestaEncuesta.findFirst.mockResolvedValue(null);

      await expect(controller.getStatus(actor)).resolves.toEqual({
        data: {
          submitted: false,
          hasActiveSurvey: true,
          surveyId: '123e4567-e89b-12d3-a456-426614174000',
        },
      });
    });

    it('informa que no hay respuesta ni encuesta disponible cuando no existe encuesta vigente', async () => {
      repository.findActiveSurveyForGraduate.mockResolvedValue(null);

      await expect(controller.getStatus(actor)).resolves.toEqual({
        data: {
          submitted: false,
          hasActiveSurvey: false,
          surveyId: null,
        },
      });
      expect(prisma.respuestaEncuesta.findFirst).not.toHaveBeenCalled();
    });

    it('falla con 404 si el actor no tiene perfil de titulado', async () => {
      await expect(
        controller.getStatus({
          ...actor,
          scopes: { ...actor.scopes, graduateId: null },
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('submit', () => {
    it('registra una respuesta nueva usando la identidad del titulado autenticado y la encuesta vigente', async () => {
      repository.findActiveSurveyForGraduate.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      repository.save.mockResolvedValue({ id: '123e4567-e89b-12d3-a456-426614174222' });

      const response = await controller.submit(actor, validBody);

      expect(repository.findActiveSurveyForGraduate).toHaveBeenCalledWith(
        actor.scopes.graduateId,
        validBody.id_encuesta,
      );
      expect(repository.save).toHaveBeenCalledWith({
        idEncuesta: '123e4567-e89b-12d3-a456-426614174000',
        idTitulado: '123e4567-e89b-12d3-a456-426614174111',
        condicionLaboral: true,
        cargo: 'Analista',
        empresa: 'UMSS',
        area: 'Sistemas',
        modalidad: 'Remoto',
        salarioMensual: '3.000–5.000',
        tiempoInsercion: '3',
      });
      expect(response).toEqual({ data: { id: '123e4567-e89b-12d3-a456-426614174222' } });
    });

    it('resuelve la encuesta vigente cuando el cliente no envía id_encuesta', async () => {
      repository.findActiveSurveyForGraduate.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      repository.save.mockResolvedValue({ id: '123e4567-e89b-12d3-a456-426614174222' });

      await controller.submit(actor, { condicion_laboral: false });

      expect(repository.findActiveSurveyForGraduate).toHaveBeenCalledWith(
        actor.scopes.graduateId,
        undefined,
      );
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          idEncuesta: '123e4567-e89b-12d3-a456-426614174000',
          idTitulado: '123e4567-e89b-12d3-a456-426614174111',
          condicionLaboral: false,
        }),
      );
    });

    it('rechaza el envío si no existe una encuesta vigente para la carrera del titulado', async () => {
      repository.findActiveSurveyForGraduate.mockResolvedValue(null);

      await expect(controller.submit(actor, validBody)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('convierte errores Prisma P2002 en conflicto HTTP 409', async () => {
      repository.findActiveSurveyForGraduate.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      repository.save.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'duplicate key value violates unique constraint',
          {
            code: 'P2002',
            clientVersion: '7.10.1',
          },
        ),
      );

      await expect(controller.submit(actor, validBody)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
    it('mantiene el tratamiento normal de otros errores de Prisma', async () => {
      repository.findActiveSurveyForGraduate.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      repository.save.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('other prisma failure', {
          code: 'P2025',
          clientVersion: '7.10.1',
        }),
      );

      await expect(controller.submit(actor, validBody)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('requiere un titulado autenticado para registrar la respuesta', async () => {
      await expect(
        controller.submit(
          { ...actor, scopes: { ...actor.scopes, graduateId: null } },
          validBody,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('valida el cuerpo con BadRequestException si los datos son inválidos', async () => {
      await expect(
        controller.submit(actor, { condicion_laboral: 'invalido' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
