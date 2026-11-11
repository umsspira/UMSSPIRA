import { BadRequestException, Controller, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { z } from 'zod';
import { CurrentActor } from '../../shared/http/auth/decorators/current-actor.decorator';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import { VacantesService, UpdateVacanteData } from './vacantes.service';

const updateVacanteSchema = z
  .object({
    titulo: z.string().trim().min(1).max(150).optional(),
    modalidad: z.string().trim().min(1).max(50).optional(),
    nivel_experiencia: z.string().trim().min(1).max(100).optional(),
    descripcion_tecnica: z.string().trim().min(1).max(20000).optional(),
    estado: z.string().trim().min(1).max(30).optional(),
  })
  .strict();

@Controller('vacantes')
export class VacantesController {
  constructor(private readonly vacantesService: VacantesService) {}

  @Get('mis-vacantes')
  async listar(@CurrentActor() actor: ActorContext) {
    return this.vacantesService.obtenerMisVacantes(actor.id);
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
    @Body() body: unknown,
    @CurrentActor() actor: ActorContext
  ) {
    const parsedBody = updateVacanteSchema.safeParse(body);
    if (!parsedBody.success) {
      throw new BadRequestException('Los datos de actualización de la vacante no son válidos.');
    }
    return this.vacantesService.actualizarVacante(
      id,
      actor.id,
      parsedBody.data satisfies UpdateVacanteData,
    );
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string, @CurrentActor() actor: ActorContext) {
    return this.vacantesService.eliminarVacante(id, actor.id);
  }
}