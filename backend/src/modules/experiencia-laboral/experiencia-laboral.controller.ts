import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './authenticated-user';
import { CreateExperienciaLaboralDto } from './dto/create-experiencia-laboral.dto';
import { UpdateExperienciaLaboralDto } from './dto/update-experiencia-laboral.dto';
import { ExperienciaLaboralService } from './experiencia-laboral.service';
import { ExperienceWriteGuard } from './experience-write.guard';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Controller()
@UseGuards(SupabaseAuthGuard)
export class ExperienciaLaboralController {
  constructor(private readonly experienciaService: ExperienciaLaboralService) {}

  @Post(['experiencias-laborales', 'api/profile/experiences'])
  @UseGuards(ExperienceWriteGuard)
  crear(
    @Body() dto: CreateExperienciaLaboralDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.experienciaService.crear(dto, request.user);
  }

  @Get(['experiencias-laborales', 'api/profile/experiences'])
  listar(@Req() request: AuthenticatedRequest) {
    return this.experienciaService.listar(request.user);
  }

  @Get([
    'experiencias-laborales/:id',
    'api/profile/experiences/:id',
  ])
  obtener(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.experienciaService.obtener(id, request.user);
  }

  @Patch(['experiencias-laborales/:id', 'api/profile/experiences/:id'])
  @UseGuards(ExperienceWriteGuard)
  actualizarParcial(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateExperienciaLaboralDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.experienciaService.actualizar(id, dto, request.user);
  }

  @Put('api/profile/experiences/:id')
  @UseGuards(ExperienceWriteGuard)
  actualizarCompatibilidad(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateExperienciaLaboralDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.experienciaService.actualizar(id, dto, request.user);
  }

  @Delete([
    'experiencias-laborales/:id',
    'api/profile/experiences/:id',
  ])
  @UseGuards(ExperienceWriteGuard)
  eliminar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.experienciaService.eliminar(id, request.user);
  }
}
