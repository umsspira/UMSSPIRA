import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FormacionAcademicaService } from './formacion-academica.service';
import { CreateFormacionAcademicaDto } from './dto/create-formation-academica.dto';
import { UpdateFormacionAcademicaDto } from './dto/update-formacion-academica.dto';

@Controller('formacion-academica')
export class FormacionAcademicaController {
  constructor(
    private readonly formacionService: FormacionAcademicaService,
  ) {}

  @Post()
  crear(@Body() dto: CreateFormacionAcademicaDto) {
    return this.formacionService.crear(dto);
  }

  @Get()
  listarPorEgresado(
    @Query('idEgresado', new ParseUUIDPipe()) idEgresado: string,
  ) {
    return this.formacionService.listarPorEgresado(idEgresado);
  }

  @Get(':id')
  obtenerPorId(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.formacionService.obtenerPorId(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateFormacionAcademicaDto,
  ) {
    return this.formacionService.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.formacionService.eliminar(id);
  }
}