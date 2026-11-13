import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import type { z } from 'zod';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import {
  createSurveyAdminSchema,
  surveyIdSchema,
  updateSurveyAdminSchema,
} from '../schemas/survey-admin.schemas';
import { SURVEY_REPOSITORY_PORT } from '../../infrastructure/providers/surveys.providers';
import type { SurveyRepositoryPort } from '../../application/ports/survey-repository.port';

@Controller('surveys/admin')
@Roles('administrador')
@RequirePermissions('reportes:read')
export class ManageSurveysController {
  constructor(
    @Inject(SURVEY_REPOSITORY_PORT)
    private readonly repository: SurveyRepositoryPort,
  ) {}

  @Get()
  async list(@CurrentActor() actor: ActorContext) {
    // Integración T5.3: la pantalla de gestión consume este listado para
    // mostrar encuestas de la carrera del administrador y sus estados.
    return { data: await this.repository.listManaged(actor.id) };
  }

  @Post()
  async create(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(createSurveyAdminSchema)) body: z.infer<typeof createSurveyAdminSchema>,
  ) {
    // Integración T5.3: crear siempre inicia en BORRADOR; la publicación se
    // realiza mediante el endpoint separado para evitar estados ambiguos.
    return {
      data: await this.repository.createManaged(actor.id, {
        title: body.title,
        startDate: body.startDate,
        endDate: body.endDate,
        format: body.format,
      }),
    };
  }

  @Patch(':id')
  async update(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(surveyIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateSurveyAdminSchema)) body: z.infer<typeof updateSurveyAdminSchema>,
  ) {
    // Integración T5.3: reutilizar esta respuesta para refrescar el formulario
    // y mostrar los errores de fechas sin consultar Prisma desde el frontend.
    return { data: await this.repository.updateManaged(actor.id, id, body) };
  }

  @Post(':id/publish')
  async publish(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(surveyIdSchema)) id: string,
  ) {
    // Integración T5.3: después de publicar, actualizar la lista porque otra
    // encuesta vigente de la misma carrera puede pasar a BORRADOR.
    return { data: await this.repository.publishManaged(actor.id, id) };
  }

  @Post(':id/unpublish')
  async unpublish(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ZodValidationPipe(surveyIdSchema)) id: string,
  ) {
    // Integración T5.3: despublicar devuelve la encuesta en BORRADOR para que
    // la pantalla pueda reflejar inmediatamente el nuevo estado.
    return { data: await this.repository.unpublishManaged(actor.id, id) };
  }
}
