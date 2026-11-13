import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';
import type {
  NivelEsperado,
  RequisitoTecnico,
  TipoRequisito,
} from './contracts/requisito-tecnico';
import { canonicalizarCompetencia } from './contracts/requisito-tecnico';
import type { ActualizarRequisitoDto } from './dto/actualizar-requisito.dto';
import type { RequisitosTecnicosRepository } from './requisitos-tecnicos.repository';

interface RequisitoTecnicoRow {
  id: string;
  id_vacante: string;
  competencia: string;
  competencia_clave: string;
  nivel: NivelEsperado;
  tipo: TipoRequisito;
  descripcion: string | null;
  fecha_creacion: string;
}

const TABLE = 'requisito_tecnico_vacante';
const COLUMNS =
  'id,id_vacante,competencia,competencia_clave,nivel,tipo,descripcion,fecha_creacion';

@Injectable()
export class SupabaseRequisitosTecnicosRepository
  implements RequisitosTecnicosRepository
{
  private readonly logger = new Logger(
    SupabaseRequisitosTecnicosRepository.name,
  );

  constructor(private readonly supabaseService: SupabaseService) {}

  async crear(requisitos: RequisitoTecnico[]): Promise<RequisitoTecnico[]> {
    const rows = requisitos.map((requisito) => ({
      id: requisito.id,
      id_vacante: requisito.idVacante,
      competencia: requisito.competencia,
      competencia_clave: canonicalizarCompetencia(requisito.competencia),
      nivel: requisito.nivel,
      tipo: requisito.tipo,
      descripcion: requisito.descripcion ?? null,
      fecha_creacion: requisito.fechaCreacion,
    }));

    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from(TABLE)
      .insert(rows)
      .select(COLUMNS);

    if (error) {
      this.throwDatabaseError(error, 'guardar requisitos técnicos');
    }

    if (!data) {
      throw new InternalServerErrorException(
        'La base de datos no devolvió los requisitos técnicos guardados.',
      );
    }

    return (data as RequisitoTecnicoRow[]).map((row) => this.mapRow(row));
  }

  async listarPorVacante(
    idVacante: string,
  ): Promise<RequisitoTecnico[]> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from(TABLE)
      .select(COLUMNS)
      .eq('id_vacante', idVacante)
      .order('fecha_creacion', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      this.throwDatabaseError(error, 'consultar requisitos técnicos');
    }

    return ((data ?? []) as RequisitoTecnicoRow[]).map((row) =>
      this.mapRow(row),
    );
  }

  async actualizar(
    idVacante: string,
    idRequisito: string,
    cambios: ActualizarRequisitoDto,
  ): Promise<RequisitoTecnico | null> {
    const update: Partial<
      Pick<RequisitoTecnicoRow, 'nivel' | 'tipo' | 'descripcion'>
    > = {};
    if (cambios.nivel !== undefined) {update.nivel = cambios.nivel;}
    if (cambios.tipo !== undefined) {update.tipo = cambios.tipo;}
    if (cambios.descripcion !== undefined) {
      update.descripcion = cambios.descripcion.trim() || null;
    }

    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from(TABLE)
      .update(update)
      .eq('id_vacante', idVacante)
      .eq('id', idRequisito)
      .select(COLUMNS)
      .maybeSingle();

    if (error) {
      this.throwDatabaseError(error, 'actualizar el requisito técnico');
    }

    return data
      ? this.mapRow(data as RequisitoTecnicoRow)
      : null;
  }

  async eliminar(
    idVacante: string,
    idRequisito: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from(TABLE)
      .delete()
      .eq('id_vacante', idVacante)
      .eq('id', idRequisito)
      .select('id')
      .maybeSingle();

    if (error) {
      this.throwDatabaseError(error, 'eliminar el requisito técnico');
    }

    return data !== null;
  }

  private mapRow(row: RequisitoTecnicoRow): RequisitoTecnico {
    return {
      id: row.id,
      idVacante: row.id_vacante,
      competencia: row.competencia,
      nivel: row.nivel,
      tipo: row.tipo,
      descripcion: row.descripcion ?? undefined,
      fechaCreacion: row.fecha_creacion,
    };
  }

  private throwDatabaseError(
    error: { code?: string; message: string },
    operation: string,
  ): never {
    if (error.code === '23503') {
      throw new NotFoundException('La vacante indicada no existe.');
    }

    if (error.code === '23505') {
      throw new BadRequestException(
        'El requisito técnico ya está asociado a esta vacante.',
      );
    }

    this.logger.error(`No se pudo ${operation}: ${error.message}`);
    throw new InternalServerErrorException(
      `No se pudo ${operation}. Verifique que la migración 0005 esté aplicada.`,
    );
  }
}
