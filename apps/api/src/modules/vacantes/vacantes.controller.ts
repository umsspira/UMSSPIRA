import { Controller, Get, Patch, Delete, Param, Body, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentActor } from '../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../shared/http/auth/decorators/require-permissions.decorator';
import { Roles } from '../../shared/http/auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import { VacantesService, UpdateVacanteData } from './vacantes.service';
import { vacancyIdSchema, type VacancyId } from './vacantes.schemas';

@Controller('vacantes')
export class VacantesController {
  constructor(private readonly vacantesService: VacantesService) {}

  @Get('mis-vacantes')
  async listar(@CurrentActor() actor: ActorContext) {
    return this.vacantesService.obtenerMisVacantes(actor.id);
  }

  @Get('mis-postulaciones')
  @Roles('titulado')
  async listarMisPostulaciones(@CurrentActor() actor: ActorContext) {
    return { data: await this.vacantesService.listarMisPostulaciones(actor.id) };
  }

  @Get(':id/oferta')
  @Roles('titulado')
  async obtenerOferta(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: ActorContext,
  ) {
    return { data: await this.vacantesService.obtenerOfertaParaTitulado(id, actor.id) };
  }

  @Get(':id/postulaciones/mia')
  async estadoPostulacion(
    @Param('id', new ZodValidationPipe(vacancyIdSchema)) idVacante: VacancyId,
    @CurrentActor() actor: ActorContext,
  ) {
    return { data: await this.vacantesService.estadoPostulacion(idVacante, actor.id) };
  }

  @Post(':id/postulaciones')
  async postular(
    @Param('id', new ZodValidationPipe(vacancyIdSchema)) idVacante: VacancyId,
    @CurrentActor() actor: ActorContext,
  ) {
    return { data: await this.vacantesService.postular(idVacante, actor.id) };
  }

  @Get(':idVacante/postulantes')
  @RequirePermissions('empresas:self:read')
  async listarPostulantes(
    @Param('idVacante', ParseUUIDPipe) idVacante: string,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.vacantesService.listarPostulantes(idVacante, actor.id);
  }

  @Get(':idVacante/postulantes/:idPostulacion')
  @RequirePermissions('empresas:self:read')
  async obtenerPostulante(
    @Param('idVacante', ParseUUIDPipe) idVacante: string,
    @Param('idPostulacion', ParseUUIDPipe) idPostulacion: string,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.vacantesService.obtenerPostulante(idVacante, idPostulacion, actor.id);
  }

  // HU-16 CA-09/CA-12: T16.4 descarga el CV solo desde una postulación de la empresa autorizada.
  @Get(':idVacante/postulantes/:idPostulacion/cv')
  @RequirePermissions('empresas:self:read')
  async descargarCv(
    @Param('idVacante', ParseUUIDPipe) idVacante: string,
    @Param('idPostulacion', ParseUUIDPipe) idPostulacion: string,
    @CurrentActor() actor: ActorContext,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.vacantesService.descargarCvPostulante(
      idVacante,
      idPostulacion,
      actor.id,
    );
    response.type(file.mime).setHeader('Content-Length', String(file.size));
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    response.setHeader('Cache-Control', 'private, no-cache');
    response.send(Buffer.from(file.bytes));
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
