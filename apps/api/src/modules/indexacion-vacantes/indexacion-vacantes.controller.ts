import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IndexacionVacantesService } from './indexacion-vacantes.service';
import { VacanteIndexable } from './interfaces/vacante-indexable.interface';

@Controller('indexacion-vacantes')
export class IndexacionVacantesController {
  constructor(
    private readonly indexacionVacantesService: IndexacionVacantesService,
  ) {}

  /**
   * Endpoint de integración provisional para HU3.
   * POST /indexacion-vacantes/:idVacante
   */
  @Post(':idVacante')
  indexar(
    @Param('idVacante') idVacante: string,
    @Body() vacante: Omit<VacanteIndexable, 'id'> & { id?: string },
  ) {
    // El ID de la ruta es la fuente de verdad y evita indexar otro ID por error.
    return this.indexacionVacantesService.indexarVacante({
      ...vacante,
      id: idVacante,
    });
  }

  @Get('estado')
  verificarEstado() {
    return this.indexacionVacantesService.verificarConexion();
  }
}
