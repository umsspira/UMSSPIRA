import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
} from '@nestjs/common';

import { z } from 'zod';

import { submitSurveySchema } from '../schemas/surveys.schemas';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { UpdateMySurveyUseCase } from '../../application/use-cases/update-my-survey.use-case';

@Controller('surveys')
export class UpdateMySurveyController {
  constructor(
    private readonly useCase: UpdateMySurveyUseCase,
  ) {}

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @Roles('titulado')
  async update(
    @CurrentActor() actor: ActorContext,
    @Body() body: unknown,
  ) {
    const result = submitSurveySchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Datos de encuesta invalidos',
        errors: z.flattenError(result.error),
      });
    }

    const tituladoId = actor.scopes.graduateId;

    if (!tituladoId) {
      throw new NotFoundException(
        'Perfil de titulado no encontrado',
      );
    }

    try {
      const updated = await this.useCase.execute({
        idEncuesta: result.data.id_encuesta ?? '',
        idTitulado: tituladoId,
        condicionLaboral: result.data.condicion_laboral,
        cargo: result.data.cargo,
        empresa: result.data.empresa,
        area: result.data.area,
        modalidad: result.data.modalidad,
        salarioMensual: result.data.salario_mensual,
        tiempoInsercion: result.data.tiempo_insercion,
      });

      return {
        data: {
          id: updated.id,
          edicion_usada: updated.edicionUsada,
          fecha_actualizacion:
            updated.fechaActualizacion?.toISOString() ?? null,
        },
      };
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        if (error.code === 'SURVEY_EDIT_ALREADY_USED' ||
            error.code === 'SURVEY_EDIT_UNAVAILABLE') {
          throw new ConflictException(error.message);
        }

        if (error.code === 'SURVEY_NOT_ACTIVE' ||
            error.code === 'SURVEY_RESPONSE_NOT_FOUND') {
          throw new NotFoundException(error.message);
        }
      }

      throw error;
    }
  }
}
