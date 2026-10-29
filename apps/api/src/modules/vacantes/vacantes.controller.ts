import { Controller, Get, Patch, Param } from '@nestjs/common';
import { CurrentActor } from '../../shared/http/auth/decorators/current-actor.decorator';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import { VacantesService } from './vacantes.service';

@Controller('vacantes')
export class VacantesController {
  constructor(private readonly vacantesService: VacantesService) {}

  @Get('mis-vacantes')
  async listar(@CurrentActor() actor: ActorContext) {
    const idUsuario = actor.id;
    return this.vacantesService.obtenerMisVacantes(idUsuario);
  }

  @Patch(':id/cerrar')
  async cerrar(@Param('id') id: string) {
    return this.vacantesService.cerrarVacante(id);
  }
}