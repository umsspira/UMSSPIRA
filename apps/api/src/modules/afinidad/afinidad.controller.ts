import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AfinidadService } from './afinidad.service';

@Controller('afinidad')
export class AfinidadController {
  constructor(private readonly service: AfinidadService) {}

  @Get('oportunidades')
  listar() { return this.service.listar(); }

  @Get('oportunidades/:id')
  detalle(@Param('id', ParseIntPipe) id: number) { return this.service.detalle(id); }

  @Get('oportunidades/:id/resultados')
  resultados(@Param('id', ParseIntPipe) id: number) { return this.service.resultados(id); }
}