import { Controller, Get, NotFoundException } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';

@Controller('surveys')
export class GetMySurveyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @Roles('titulado')
  async handle(@CurrentActor() actor: ActorContext) {
    const idTitulado = actor.scopes.graduateId;
    if (!idTitulado) {
      throw new NotFoundException('Perfil de titulado no encontrado');
    }

    const survey = await this.prisma.encuesta.findFirst({ orderBy: { fecha_creacion: 'desc' } });
    if (!survey) {
      throw new NotFoundException('No existe una encuesta disponible');
    }

    const saved = await this.prisma.respuestaEncuesta.findUnique({
      where: { uq_respuesta_encuesta_titulado: { idEncuesta: survey.id, idTitulado } },
    });

    return { data: { responded: Boolean(saved), response: saved ? {
      condicion_laboral: saved.condicionLaboral === 'true',
      cargo: saved.cargo,
      empresa: saved.empresa,
      area: saved.area,
      modalidad: saved.modalidad,
      salario_mensual: saved.salarioMensual,
      tiempo_insercion: saved.tiempoInsercion,
    } : null } };
  }
}
