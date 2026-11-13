import { Controller, Get, Patch, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { CurrentActor } from '../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import { VacantesService, UpdateVacanteData } from './vacantes.service';

@Controller('vacantes')
export class VacantesController {
  constructor(private readonly vacantesService: VacantesService) {}

  @Get('mis-vacantes')
  async listar(@CurrentActor() actor: ActorContext) {
    return this.vacantesService.obtenerMisVacantes(actor.id);
  }

  // HU-04: la empresa cambia la etapa de un postulante de SUS vacantes.
  @Patch(':idVacante/postulantes/:idPostulacion/etapa')
  @RequirePermissions('empresas:self:write')
  async cambiarEtapa(
    @Param('idVacante', ParseUUIDPipe) idVacante: string,
    @Param('idPostulacion', ParseUUIDPipe) idPostulacion: string,
    @Body() body: { etapa?: string },
    @CurrentActor() actor: ActorContext,
  ) {
    return this.vacantesService.cambiarEtapaPostulante(idVacante, idPostulacion, actor.id, body?.etapa);
  }

  @Get(':id')
  async obtenerDetalle(@Param('id') id: string, @CurrentActor() actor: ActorContext) {
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

  @Delete(':id')
  async eliminar(@Param('id') id: string, @CurrentActor() actor: ActorContext) {
    return this.vacantesService.eliminarVacante(id, actor.id);
  }
}