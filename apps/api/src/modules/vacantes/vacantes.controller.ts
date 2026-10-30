import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { CurrentActor } from '../../shared/http/auth/decorators/current-actor.decorator';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import { VacantesService, UpdateVacanteData } from './vacantes.service';

@Controller('vacantes')
export class VacantesController {
  constructor(private readonly vacantesService: VacantesService) {}

  @Get('mis-vacantes')
  async listar(@CurrentActor() actor: ActorContext) {
    const idUsuario = actor.id;
    return this.vacantesService.obtenerMisVacantes(idUsuario);
  }

  @Get(':id')
  async obtenerDetalle(
    @Param('id') id: string,
    @CurrentActor() actor: ActorContext
  ) {
    return this.vacantesService.obtenerVacantePorId(id, actor.id);
  }

  @Patch(':id/cerrar')
  async cerrar(@Param('id') id: string) {
    return this.vacantesService.cerrarVacante(id);
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() body: UpdateVacanteData,
    @CurrentActor() actor: ActorContext
  ) {
    return this.vacantesService.actualizarVacante(id, actor.id, body);
  }
}