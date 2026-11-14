import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  EstructuraIndexacionVacante,
  RequisitoIndexadoMatching,
  RequisitoTecnico,
} from './contracts/requisito-tecnico';
import {
  canonicalizarCompetencia,
  PESOS_NIVEL,
} from './contracts/requisito-tecnico';

import { ActualizarRequisitoDto } from './dto/actualizar-requisito.dto';
import { RequisitoTecnicoItemDto } from './dto/requisito-tecnico-item.dto';
import { REQUISITOS_TECNICOS_REPOSITORY } from './requisitos-tecnicos.repository';
import type { RequisitosTecnicosRepository } from './requisitos-tecnicos.repository';

@Injectable()
export class RequisitosTecnicosService {
  constructor(
    @Inject(REQUISITOS_TECNICOS_REPOSITORY)
    private readonly repository: RequisitosTecnicosRepository,
  ) {}

  /**
   * Associates technical requirements to a vacancy, ensuring indexing and duplicate prevention
   */
  async asociarRequisitos(
    idVacante: string,
    requisitos: RequisitoTecnicoItemDto[],
  ): Promise<RequisitoTecnico[]> {
    const cleanVacancyId = idVacante?.trim();
    if (!cleanVacancyId) {
      throw new BadRequestException('El identificador de la vacante es obligatorio.');
    }

    if (!Array.isArray(requisitos) || requisitos.length === 0) {
      throw new BadRequestException('Debe proporcionar al menos un requisito técnico.');
    }

    // Check for internal duplicates within the payload
    const incomingKeys = new Set<string>();
    for (const req of requisitos) {
      const key = canonicalizarCompetencia(req.competencia);
      if (!key) {
        throw new BadRequestException('El nombre de la competencia técnica no puede estar vacío.');
      }
      if (incomingKeys.has(key)) {
        throw new BadRequestException(
          `La competencia técnica '${req.competencia.trim()}' está duplicada en la solicitud.`,
        );
      }
      incomingKeys.add(key);
    }

    const existing = await this.repository.listarPorVacante(cleanVacancyId);
    const existingKeys = new Set(
      existing.map((requisito) =>
        canonicalizarCompetencia(requisito.competencia),
      ),
    );
    for (const req of requisitos) {
      const key = canonicalizarCompetencia(req.competencia);
      if (existingKeys.has(key)) {
        throw new BadRequestException(
          `El requisito técnico '${req.competencia.trim()}' ya está asociado a esta vacante.`,
        );
      }
    }

    const timestamp = new Date().toISOString();
    const savedRequirements = requisitos.map((req): RequisitoTecnico => ({
      id: req.id ?? randomUUID(),
      idVacante: cleanVacancyId,
      competencia: req.competencia.trim(),
      nivel: req.nivel,
      tipo: req.tipo,
      descripcion: req.descripcion?.trim() || undefined,
      fechaCreacion: timestamp,
    }));

    return this.repository.crear(savedRequirements);
  }

  /**
   * Retrieves all technical requirements strictly associated with the given vacancy
   */
  obtenerRequisitos(idVacante: string): Promise<RequisitoTecnico[]> {
    const cleanVacancyId = idVacante?.trim();
    if (!cleanVacancyId) {
      throw new BadRequestException('El identificador de la vacante es obligatorio.');
    }

    return this.repository.listarPorVacante(cleanVacancyId);
  }

  /**
   * Prepares and returns the indexed structure used by the matching engine
   */
  async obtenerEstructuraIndexacion(
    idVacante: string,
  ): Promise<EstructuraIndexacionVacante> {
    const requirements = await this.obtenerRequisitos(idVacante);

    const obligatorios = requirements.filter((r) => r.tipo === 'Obligatorio');
    const deseables = requirements.filter((r) => r.tipo === 'Deseable');

    const competenciasIndex: Record<string, RequisitoIndexadoMatching> = {};

    for (const req of requirements) {
      const key = canonicalizarCompetencia(req.competencia);
      competenciasIndex[key] = {
        idRequisito: req.id,
        competenciaOriginal: req.competencia,
        nivelEsperado: req.nivel,
        pesoNivel: PESOS_NIVEL[req.nivel] ?? 1,
        tipo: req.tipo,
        esObligatorio: req.tipo === 'Obligatorio',
        descripcion: req.descripcion,
      };
    }

    return {
      idVacante,
      totalRequisitos: requirements.length,
      obligatorios,
      deseables,
      competenciasIndex,
      metadatosMatching: {
        totalObligatorios: obligatorios.length,
        totalDeseables: deseables.length,
        requiereMatchingExacto: obligatorios.length > 0,
        versionMotor: '1.0.0-sprint1',
      },
    };
  }

  /**
   * Updates level or type of an existing requirement
   */
  async actualizarRequisito(
    idVacante: string,
    idRequisito: string,
    dto: ActualizarRequisitoDto,
  ): Promise<RequisitoTecnico> {
    const cleanVacancyId = idVacante?.trim();
    if (!cleanVacancyId) {
      throw new BadRequestException('El identificador de la vacante es obligatorio.');
    }

    if (
      dto.nivel === undefined &&
      dto.tipo === undefined &&
      dto.descripcion === undefined
    ) {
      throw new BadRequestException(
        'Debes indicar al menos un campo para actualizar.',
      );
    }

    const updated = await this.repository.actualizar(
      cleanVacancyId,
      idRequisito,
      dto,
    );
    if (!updated) {
      throw new NotFoundException('El requisito técnico especificado no existe.');
    }
    return updated;
  }

  /**
   * Deletes a requirement from the vacancy index
   */
  async eliminarRequisito(
    idVacante: string,
    idRequisito: string,
  ): Promise<{ eliminado: true; id: string }> {
    const cleanVacancyId = idVacante?.trim();
    if (!cleanVacancyId) {
      throw new BadRequestException('El identificador de la vacante es obligatorio.');
    }

    const eliminado = await this.repository.eliminar(
      cleanVacancyId,
      idRequisito,
    );
    if (!eliminado) {
      throw new NotFoundException('El requisito técnico especificado no existe.');
    }
    return { eliminado: true, id: idRequisito };
  }
}
