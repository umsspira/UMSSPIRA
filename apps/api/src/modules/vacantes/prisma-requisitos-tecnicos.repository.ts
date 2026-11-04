import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
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
  nivel: string;
  tipo: string;
  descripcion: string | null;
  fecha_creacion: Date;
}

@Injectable()
export class PrismaRequisitosTecnicosRepository
  implements RequisitosTecnicosRepository
{
  private readonly logger = new Logger(
    PrismaRequisitosTecnicosRepository.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  async crear(requisitos: RequisitoTecnico[]): Promise<RequisitoTecnico[]> {
    try {
      const rows = await this.prisma.$transaction(
        requisitos.map((requisito) =>
          this.prisma.requisitoTecnicoVacante.create({
            data: {
              id: requisito.id,
              id_vacante: requisito.idVacante,
              competencia: requisito.competencia,
              competencia_clave: canonicalizarCompetencia(
                requisito.competencia,
              ),
              nivel: requisito.nivel,
              tipo: requisito.tipo,
              descripcion: requisito.descripcion ?? null,
              fecha_creacion: new Date(requisito.fechaCreacion),
            },
          }),
        ),
      );
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      this.throwDatabaseError(error, 'guardar requisitos técnicos');
    }
  }

  async listarPorVacante(
    idVacante: string,
  ): Promise<RequisitoTecnico[]> {
    try {
      const rows = await this.prisma.requisitoTecnicoVacante.findMany({
        where: { id_vacante: idVacante },
        orderBy: [{ fecha_creacion: 'asc' }, { id: 'asc' }],
      });
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      this.throwDatabaseError(error, 'consultar requisitos técnicos');
    }
  }

  async actualizar(
    idVacante: string,
    idRequisito: string,
    cambios: ActualizarRequisitoDto,
  ): Promise<RequisitoTecnico | null> {
    const data: {
      nivel?: NivelEsperado;
      tipo?: TipoRequisito;
      descripcion?: string | null;
    } = {};
    if (cambios.nivel !== undefined) {data.nivel = cambios.nivel;}
    if (cambios.tipo !== undefined) {data.tipo = cambios.tipo;}
    if (cambios.descripcion !== undefined) {
      data.descripcion = cambios.descripcion.trim() || null;
    }

    try {
      const updated = await this.prisma.requisitoTecnicoVacante.updateMany({
        where: { id_vacante: idVacante, id: idRequisito },
        data,
      });
      if (updated.count === 0) {return null;}

      const row = await this.prisma.requisitoTecnicoVacante.findUnique({
        where: { id: idRequisito },
      });
      return row ? this.mapRow(row) : null;
    } catch (error) {
      this.throwDatabaseError(error, 'actualizar el requisito técnico');
    }
  }

  async eliminar(
    idVacante: string,
    idRequisito: string,
  ): Promise<boolean> {
    try {
      const result = await this.prisma.requisitoTecnicoVacante.deleteMany({
        where: { id_vacante: idVacante, id: idRequisito },
      });
      return result.count > 0;
    } catch (error) {
      this.throwDatabaseError(error, 'eliminar el requisito técnico');
    }
  }

  private mapRow(row: RequisitoTecnicoRow): RequisitoTecnico {
    return {
      id: row.id,
      idVacante: row.id_vacante,
      competencia: row.competencia,
      nivel: row.nivel as NivelEsperado,
      tipo: row.tipo as TipoRequisito,
      descripcion: row.descripcion ?? undefined,
      fechaCreacion: row.fecha_creacion.toISOString(),
    };
  }

  private throwDatabaseError(error: unknown, operation: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'El requisito técnico ya está asociado a esta vacante.',
        );
      }
      if (error.code === 'P2003') {
        throw new NotFoundException('La vacante indicada no existe.');
      }
    }

    this.logger.error(
      `No se pudo ${operation}: ${error instanceof Error ? error.message : 'error desconocido'}`,
    );
    throw new InternalServerErrorException(
      `No se pudo ${operation}. Verifique que las migraciones Prisma estén aplicadas.`,
    );
  }
}
