import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';
import { CreateFormacionAcademicaDto } from './dto/create-formation-academica.dto';
import { UpdateFormacionAcademicaDto } from './dto/update-formacion-academica.dto';

type FormacionDb = {
  id: string;
  id_egresado: string;
  id_carrera: string | null;
  tipo_formacion: 'Bachiller' | 'Carrera';
  institucion: string;
  titulo: string;
  nivel_academico: string;
  estado: 'Cursando' | 'Concluido' | 'Titulado';
  anio_inicio: number;
  anio_fin: number | null;
  anio_egreso: number | null;
  descripcion: string | null;
  fecha_creacion: string;
};

@Injectable()
export class FormacionAcademicaService {
  private readonly table = 'formacion_academica';

  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  private mapFormacion(row: FormacionDb) {
    return {
      idFormacion: row.id,
      idEgresado: row.id_egresado,
      idCarrera: row.id_carrera,
      tipoFormacion: row.tipo_formacion,
      institucion: row.institucion,
      titulo: row.titulo,
      nivelAcademico: row.nivel_academico,
      estado: row.estado,
      anioInicio: row.anio_inicio,
      anioFin: row.anio_fin,
      descripcion: row.descripcion ?? undefined,
    };
  }

  async listarPorEgresado(idEgresado: string) {
    const { data, error } = await this.db
      .from(this.table)
      .select('*')
      .eq('id_egresado', idEgresado)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo consultar la formación académica.',
      );
    }

    return (data as FormacionDb[]).map((row) => this.mapFormacion(row));
  }

  async obtenerPorId(id: string) {
    const { data, error } = await this.db
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo consultar la formación académica.',
      );
    }

    if (!data) {
      throw new NotFoundException('La formación académica no existe.');
    }

    return this.mapFormacion(data as FormacionDb);
  }

  private async validarReferencias(
    idEgresado: string,
    idCarrera?: string | null,
  ) {
    const { data: egresado, error: egresadoError } = await this.db
      .from('egresado')
      .select('id')
      .eq('id', idEgresado)
      .maybeSingle();

    if (egresadoError) {
      throw new InternalServerErrorException(
        'No se pudo verificar el egresado.',
      );
    }

    if (!egresado) {
      throw new BadRequestException('El egresado indicado no existe.');
    }

    if (idCarrera) {
      const { data: carrera, error: carreraError } = await this.db
        .from('carrera')
        .select('id')
        .eq('id', idCarrera)
        .maybeSingle();

      if (carreraError) {
        throw new InternalServerErrorException(
          'No se pudo verificar la carrera.',
        );
      }

      if (!carrera) {
        throw new BadRequestException('La carrera indicada no existe.');
      }
    }
  }

  private validarPeriodo(anioInicio: number, anioFin?: number | null) {
    if (anioFin != null && anioFin < anioInicio) {
      throw new BadRequestException(
        'El año de finalización no puede ser anterior al año de inicio.',
      );
    }
  }

  async crear(dto: CreateFormacionAcademicaDto) {
    if (dto.tipoFormacion === 'Carrera' && !dto.idCarrera) {
      throw new BadRequestException(
        'Debes seleccionar una carrera para este tipo de formación.',
      );
    }

    if (dto.tipoFormacion === 'Bachiller' && dto.titulo !== 'Bachiller') {
      throw new BadRequestException(
        'El título para el tipo Bachiller debe ser Bachiller.',
      );
    }

    this.validarPeriodo(dto.anioInicio, dto.anioFin);
    await this.validarReferencias(dto.idEgresado, dto.idCarrera);

    const { data, error } = await this.db
      .from(this.table)
      .insert({
        id_egresado: dto.idEgresado,
        id_carrera: dto.idCarrera ?? null,
        tipo_formacion: dto.tipoFormacion,
        institucion: dto.institucion.trim(),
        titulo: dto.titulo.trim(),
        nivel_academico: dto.nivelAcademico,
        estado: dto.estado,
        anio_inicio: dto.anioInicio,
        anio_fin: dto.anioFin ?? null,

        // Compatibilidad con el esquema antiguo de la tabla.
        anio_egreso: dto.anioFin ?? null,

        descripcion: dto.descripcion?.trim() || null,
      })
      .select('*')
      .single();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo registrar la formación académica.',
      );
    }

    return this.mapFormacion(data as FormacionDb);
  }

  async actualizar(id: string, dto: UpdateFormacionAcademicaDto) {
    const actual = await this.obtenerPorId(id);

    const idEgresado = dto.idEgresado ?? actual.idEgresado;
    const idCarrera = dto.idCarrera !== undefined ? dto.idCarrera : actual.idCarrera;
    const anioInicio = dto.anioInicio ?? actual.anioInicio;
    const anioFin = dto.anioFin !== undefined ? dto.anioFin : actual.anioFin;
    const tipoFormacion = dto.tipoFormacion ?? actual.tipoFormacion;
    const titulo = dto.titulo ?? actual.titulo;

    if (tipoFormacion === 'Carrera' && !idCarrera) {
      throw new BadRequestException(
        'Debes seleccionar una carrera para este tipo de formación.',
      );
    }

    if (tipoFormacion === 'Bachiller' && titulo !== 'Bachiller') {
      throw new BadRequestException(
        'El título para el tipo Bachiller debe ser Bachiller.',
      );
    }

    this.validarPeriodo(anioInicio, anioFin);
    await this.validarReferencias(idEgresado, idCarrera);

    const cambios: Record<string, unknown> = {};

    if (dto.idEgresado !== undefined) cambios.id_egresado = dto.idEgresado;
    if (dto.idCarrera !== undefined) cambios.id_carrera = dto.idCarrera;
    if (dto.tipoFormacion !== undefined) cambios.tipo_formacion = dto.tipoFormacion;
    if (dto.institucion !== undefined) cambios.institucion = dto.institucion.trim();
    if (dto.titulo !== undefined) cambios.titulo = dto.titulo.trim();
    if (dto.nivelAcademico !== undefined) cambios.nivel_academico = dto.nivelAcademico;
    if (dto.estado !== undefined) cambios.estado = dto.estado;
    if (dto.anioInicio !== undefined) cambios.anio_inicio = dto.anioInicio;

    if (dto.anioFin !== undefined) {
      cambios.anio_fin = dto.anioFin;
      cambios.anio_egreso = dto.anioFin;
    }

    if (dto.descripcion !== undefined) {
      cambios.descripcion = dto.descripcion.trim() || null;
    }

    const { data, error } = await this.db
      .from(this.table)
      .update(cambios)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo actualizar la formación académica.',
      );
    }

    if (!data) {
      throw new NotFoundException('La formación académica no existe.');
    }

    return this.mapFormacion(data as FormacionDb);
  }

  async eliminar(id: string) {
    const { data, error } = await this.db
      .from(this.table)
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo eliminar la formación académica.',
      );
    }

    if (!data) {
      throw new NotFoundException('La formación académica no existe.');
    }

    return { mensaje: 'Formación académica eliminada correctamente.' };
  }

  async listarCarreras() {
    const { data, error } = await this.db
      .from('carrera')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (error) {
      throw new InternalServerErrorException(
        'No se pudieron consultar las carreras.',
      );
    }

    return (data ?? []).map((carrera) => ({
      idCarrera: carrera.id,
      nombre: carrera.nombre,
    }));
  }
}