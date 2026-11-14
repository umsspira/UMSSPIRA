import { Controller, Get } from '@nestjs/common';
import { FormacionAcademicaService } from './formacion-academica.service';

@Controller('carreras')
export class CarrerasController {
  constructor(
    private readonly formacionService: FormacionAcademicaService,
  ) {}

  @Get()
  listar() {
    return this.formacionService.listarCarreras();
  }
}