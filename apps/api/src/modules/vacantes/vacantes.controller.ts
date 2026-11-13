import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { CurrentActor } from '../../shared/http/auth/decorators/current-actor.decorator';
import { Public } from '../../shared/http/auth/decorators/public.decorator';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import { ActualizarRequisitoDto } from './dto/actualizar-requisito.dto';
import { AddRequisitosDto } from './dto/add-requisitos.dto';
import { AsociarRequisitosDto } from './dto/asociar-requisitos.dto';
import { CreateVacanteDto } from './dto/create-vacante.dto';
import { ValidarEstructuraVacanteDto } from './dto/validar-estructura-vacante.dto';
import { VacantesIndexService } from './indexacion/vacantes-index.service';
import { RequisitosTecnicosService } from './requisitos-tecnicos.service';
import { VacantesEstructuraService } from './vacantes-estructura.service';
import { VacantesService, type UpdateVacanteData } from './vacantes.service';

@Controller('vacantes')
export class VacantesController {
  constructor(
    private readonly vacantesEstructuraService: VacantesEstructuraService,
    private readonly requisitosTecnicosService: RequisitosTecnicosService,
    private readonly vacantesService: VacantesService,
    private readonly vacantesIndexService: VacantesIndexService,
  ) {}

  @Public()
  @Post('estructura/validar')
  @HttpCode(HttpStatus.OK)
  validar(@Body() dto: ValidarEstructuraVacanteDto) {
    return this.vacantesEstructuraService.preparar(dto);
  }

  @Post()
  crear(
    @Body() dto: CreateVacanteDto,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.vacantesService.crear(dto, actor.id);
  }

  @Get()
  listar(@CurrentActor() actor: ActorContext) {
    return this.vacantesService.obtenerMisVacantes(actor.id);
  }

  @Get('mis-vacantes')
  listarMisVacantes(@CurrentActor() actor: ActorContext) {
    return this.vacantesService.obtenerMisVacantes(actor.id);
  }

  @Public()
  @Get('disponibilidad')
  consultarDisponibilidad(@Query('buscar') buscar?: string) {
    return this.vacantesService.consultarDisponibilidad(buscar);
  }

  @Public()
  @Get('buscar')
  buscar(@Query('q') query = '') {
    return this.vacantesIndexService.buscar(query);
  }

  @Get(':id/requisitos')
  async obtenerRequisitos(
    @Param('id', new ParseUUIDPipe()) idVacante: string,
    @CurrentActor() actor: ActorContext,
  ) {
    await this.assertVacancyOwner(idVacante, actor);
    return this.requisitosTecnicosService.obtenerRequisitos(idVacante);
  }

  @Post(':id/requisitos')
  @HttpCode(HttpStatus.CREATED)
  async asociarRequisitos(
    @Param('id', new ParseUUIDPipe()) idVacante: string,
    @Body() dto: AsociarRequisitosDto | AddRequisitosDto,
    @CurrentActor() actor: ActorContext,
  ) {
    await this.assertVacancyOwner(idVacante, actor);
    const body = dto as unknown;
    if (!isRecord(body) || !Array.isArray(body.requisitos)) {
      throw new BadRequestException('Debe proporcionar una lista de requisitos.');
    }

    if (body.requisitos.every((requirement) => typeof requirement === 'string')) {
      const input = plainToInstance(AddRequisitosDto, body);
      const errors = await validate(input);
      if (errors.length > 0) {
        throw new BadRequestException(validationMessages(errors));
      }
      return this.vacantesService.agregarRequisitos(
        idVacante,
        input.requisitos,
      );
    }

    const input = plainToInstance(AsociarRequisitosDto, body);
    const errors = await validate(input);
    if (errors.length > 0) {
      throw new BadRequestException(validationMessages(errors));
    }
    return this.requisitosTecnicosService.asociarRequisitos(
      idVacante,
      input.requisitos,
    );
  }

  @Get(':id/requisitos/matching')
  async obtenerEstructuraIndexacion(
    @Param('id', new ParseUUIDPipe()) idVacante: string,
    @CurrentActor() actor: ActorContext,
  ) {
    await this.assertVacancyOwner(idVacante, actor);
    return this.requisitosTecnicosService.obtenerEstructuraIndexacion(
      idVacante,
    );
  }

  @Patch(':id/requisitos/:idRequisito')
  async actualizarRequisito(
    @Param('id', new ParseUUIDPipe()) idVacante: string,
    @Param('idRequisito', new ParseUUIDPipe()) idRequisito: string,
    @Body() dto: ActualizarRequisitoDto,
    @CurrentActor() actor: ActorContext,
  ) {
    await this.assertVacancyOwner(idVacante, actor);
    return this.requisitosTecnicosService.actualizarRequisito(
      idVacante,
      idRequisito,
      dto,
    );
  }

  @Delete(':id/requisitos/:idRequisito')
  async eliminarRequisito(
    @Param('id', new ParseUUIDPipe()) idVacante: string,
    @Param('idRequisito', new ParseUUIDPipe()) idRequisito: string,
    @CurrentActor() actor: ActorContext,
  ) {
    await this.assertVacancyOwner(idVacante, actor);
    return this.requisitosTecnicosService.eliminarRequisito(
      idVacante,
      idRequisito,
    );
  }

  @Get(':id')
  obtenerDetalle(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.vacantesService.obtenerVacantePorId(id, actor.id);
  }

  @Patch(':id/cerrar')
  cerrar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.vacantesService.cerrarVacante(id, actor.id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateVacanteData,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.vacantesService.actualizarVacante(id, actor.id, body);
  }

  @Delete(':id')
  eliminar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.vacantesService.eliminarVacante(id, actor.id);
  }

  @Post(':id/indexar')
  async indexar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentActor() actor: ActorContext,
  ) {
    await this.assertVacancyOwner(id, actor);
    return this.vacantesIndexService.indexarVacante(id);
  }

  private async assertVacancyOwner(
    idVacante: string,
    actor: ActorContext,
  ): Promise<void> {
    await this.vacantesService.obtenerVacantePorId(idVacante, actor.id);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validationMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...validationMessages(error.children ?? []),
  ]);
}
