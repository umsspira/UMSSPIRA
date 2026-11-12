import {
  Controller, Patch, Param, Body, NotFoundException, ForbiddenException, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';

const ALLOWED_STAGES = ['Postulado', 'En revisión', 'Preseleccionado', 'Entrevista', 'Descartado'];

@Controller('applications')
export class UpdateApplicationStageController {
  constructor(private prisma: PrismaService) {}

  @Patch(':id/stage')
  @RequirePermissions('solicitudes:review')
  async updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { stage: string },
    @CurrentActor() actor: ActorContext,
  ) {
    console.log('>>> CONECTADO A LA BD:', process.env.DATABASE_URL);
    if (!body?.stage || !ALLOWED_STAGES.includes(body.stage)) {
      throw new BadRequestException('Etapa inválida.');
    }
    const postulacion = await this.prisma.postulacion.findUnique({
      where: { id },
      include: { vacante: { include: { empresa: true } } },
    });
    if (!postulacion) {
      throw new NotFoundException('Postulación no encontrada');
    }
    if (postulacion.vacante?.empresa?.id_usuario !== actor.id) {
      throw new ForbiddenException('No tienes permiso');
    }
    return this.prisma.postulacion.update({
      where: { id },
      data: { estado: body.stage },
    });
  }
}