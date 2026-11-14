import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';
import { AuthenticatedUser } from './authenticated-user';
import { CreateExperienciaLaboralDto } from './dto/create-experiencia-laboral.dto';
import { UpdateExperienciaLaboralDto } from './dto/update-experiencia-laboral.dto';

interface ExperienciaLaboralRow {
  id: string;
  id_egresado: string;
  empresa: string;
  cargo: string;
  descripcion: string | null;
  tipo_empleo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  es_actual: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

const EXPERIENCE_COLUMNS =
  'id, id_egresado, empresa, cargo, descripcion, tipo_empleo, fecha_inicio, fecha_fin, es_actual, fecha_creacion, fecha_actualizacion';

@Injectable()
export class ExperienciaLaboralService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getAdminClient();
  }

  private mapExperience(row: ExperienciaLaboralRow) {
    return {
      id: row.id,
      company: row.empresa,
      position: row.cargo,
      description: row.descripcion ?? '',
      employmentType: row.tipo_empleo,
      startDate: row.fecha_inicio,
      endDate: row.fecha_fin ?? '',
      currentlyWorking: row.es_actual,
    };
  }

  private validatePeriod(
    startDate: string,
    endDate: string | null | undefined,
    currentlyWorking: boolean,
  ) {
    if (currentlyWorking && endDate) {
      throw new BadRequestException(
        'La fecha de finalización debe estar vacía si el empleo continúa.',
      );
    }

    if (!currentlyWorking && !endDate) {
      throw new BadRequestException(
        'La fecha de finalización es obligatoria si el empleo ya terminó.',
      );
    }

    if (endDate && endDate < startDate) {
      throw new BadRequestException(
        'La fecha de finalización no puede ser anterior a la fecha de inicio.',
      );
    }
  }

  private toDatabase(dto: CreateExperienciaLaboralDto) {
    this.validatePeriod(dto.startDate, dto.endDate, dto.currentlyWorking);
    const endDate = dto.currentlyWorking ? null : dto.endDate || null;

    return {
      empresa: dto.company.trim(),
      cargo: dto.position.trim(),
      descripcion: dto.description.trim(),
      tipo_empleo: dto.employmentType.trim(),
      fecha_inicio: dto.startDate,
      fecha_fin: endDate,
      es_actual: dto.currentlyWorking,
    };
  }

  async listar(user: AuthenticatedUser) {
    const { data, error } = await this.db
      .from('experiencia_laboral')
      .select(EXPERIENCE_COLUMNS)
      .eq('id_egresado', user.egresadoId)
      .order('fecha_inicio', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        'No se pudieron consultar las experiencias laborales.',
      );
    }

    return (data as ExperienciaLaboralRow[]).map((row) =>
      this.mapExperience(row),
    );
  }

  async obtener(id: string, user: AuthenticatedUser) {
    const { data, error } = await this.db
      .from('experiencia_laboral')
      .select(EXPERIENCE_COLUMNS)
      .eq('id', id)
      .eq('id_egresado', user.egresadoId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo consultar la experiencia laboral.',
      );
    }

    if (!data) {
      throw new NotFoundException('La experiencia laboral no existe.');
    }

    return this.mapExperience(data as ExperienciaLaboralRow);
  }

  async crear(dto: CreateExperienciaLaboralDto, user: AuthenticatedUser) {
    const { data, error } = await this.db
      .from('experiencia_laboral')
      .insert({
        ...this.toDatabase(dto),
        id_egresado: user.egresadoId,
      })
      .select(EXPERIENCE_COLUMNS)
      .single();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo registrar la experiencia laboral.',
      );
    }

    return this.mapExperience(data as ExperienciaLaboralRow);
  }

  async actualizar(
    id: string,
    dto: UpdateExperienciaLaboralDto,
    user: AuthenticatedUser,
  ) {
    const actual = await this.obtener(id, user);
    const currentlyWorking = dto.currentlyWorking ?? actual.currentlyWorking;
    const merged: CreateExperienciaLaboralDto = {
      company: dto.company ?? actual.company,
      position: dto.position ?? actual.position,
      description: dto.description ?? actual.description,
      employmentType: dto.employmentType ?? actual.employmentType,
      startDate: dto.startDate ?? actual.startDate,
      currentlyWorking,
      endDate: currentlyWorking
        ? null
        : dto.endDate !== undefined
          ? dto.endDate
          : actual.endDate || undefined,
    };
    const cambios = this.toDatabase(merged);

    const { data, error } = await this.db
      .from('experiencia_laboral')
      .update({
        ...cambios,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('id_egresado', user.egresadoId)
      .select(EXPERIENCE_COLUMNS)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo actualizar la experiencia laboral.',
      );
    }

    if (!data) {
      throw new NotFoundException('La experiencia laboral no existe.');
    }

    return this.mapExperience(data as ExperienciaLaboralRow);
  }

  async eliminar(id: string, user: AuthenticatedUser) {
    const { data, error } = await this.db
      .from('experiencia_laboral')
      .delete()
      .eq('id', id)
      .eq('id_egresado', user.egresadoId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo eliminar la experiencia laboral.',
      );
    }

    if (!data) {
      throw new NotFoundException('La experiencia laboral no existe.');
    }

    return { eliminado: true };
  }
}
