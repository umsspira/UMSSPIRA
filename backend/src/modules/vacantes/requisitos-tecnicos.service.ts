import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  EstructuraIndexacionVacante,
  RequisitoIndexadoMatching,
  RequisitoTecnico,
} from './contracts/requisito-tecnico';
import { PESOS_NIVEL } from './contracts/requisito-tecnico';

import { ActualizarRequisitoDto } from './dto/actualizar-requisito.dto';
import { RequisitoTecnicoItemDto } from './dto/requisito-tecnico-item.dto';

@Injectable()
export class RequisitosTecnicosService {
  // Store indexed technical requirements by vacancy identifier
  private readonly vacantesIndex = new Map<string, Map<string, RequisitoTecnico>>();

  /**
   * Normalizes competency name for unique indexing comparisons
   */
  private canonicalKey(competencia: string): string {
    return competencia
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Associates technical requirements to a vacancy, ensuring indexing and duplicate prevention
   */
  asociarRequisitos(
    idVacante: string,
    requisitos: RequisitoTecnicoItemDto[],
  ): RequisitoTecnico[] {
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
      const key = this.canonicalKey(req.competencia);
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

    // Retrieve or initialize the index map for this vacancy
    let vacancyRequirementsMap = this.vacantesIndex.get(cleanVacancyId);
    if (!vacancyRequirementsMap) {
      vacancyRequirementsMap = new Map<string, RequisitoTecnico>();
      this.vacantesIndex.set(cleanVacancyId, vacancyRequirementsMap);
    }

    // Check for collision with already associated requirements (avoid duplication in index)
    for (const req of requisitos) {
      const key = this.canonicalKey(req.competencia);
      if (vacancyRequirementsMap.has(key)) {
        throw new BadRequestException(
          `El requisito técnico '${req.competencia.trim()}' ya está asociado a esta vacante.`,
        );
      }
    }

    // Associate all valid requirements to the specified vacancy ID
    const savedRequirements: RequisitoTecnico[] = [];
    const timestamp = new Date().toISOString();

    for (const req of requisitos) {
      const key = this.canonicalKey(req.competencia);
      const requirement: RequisitoTecnico = {
        id: req.id ?? randomUUID(),
        idVacante: cleanVacancyId,
        competencia: req.competencia.trim(),
        nivel: req.nivel,
        tipo: req.tipo,
        descripcion: req.descripcion?.trim() || undefined,
        fechaCreacion: timestamp,
      };

      vacancyRequirementsMap.set(key, requirement);
      savedRequirements.push(requirement);
    }

    return savedRequirements;
  }

  /**
   * Retrieves all technical requirements strictly associated with the given vacancy
   */
  obtenerRequisitos(idVacante: string): RequisitoTecnico[] {
    const cleanVacancyId = idVacante?.trim();
    if (!cleanVacancyId) {
      throw new BadRequestException('El identificador de la vacante es obligatorio.');
    }

    const vacancyRequirementsMap = this.vacantesIndex.get(cleanVacancyId);
    if (!vacancyRequirementsMap) {
      return [];
    }

    // Returns array of requirements strictly belonging to this vacancy
    return Array.from(vacancyRequirementsMap.values());
  }

  /**
   * Prepares and returns the indexed structure used by the matching engine
   */
  obtenerEstructuraIndexacion(idVacante: string): EstructuraIndexacionVacante {
    const requirements = this.obtenerRequisitos(idVacante);

    const obligatorios = requirements.filter((r) => r.tipo === 'Obligatorio');
    const deseables = requirements.filter((r) => r.tipo === 'Deseable');

    const competenciasIndex: Record<string, RequisitoIndexadoMatching> = {};

    for (const req of requirements) {
      const key = this.canonicalKey(req.competencia);
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
  actualizarRequisito(
    idVacante: string,
    idRequisito: string,
    dto: ActualizarRequisitoDto,
  ): RequisitoTecnico {
    const cleanVacancyId = idVacante?.trim();
    const vacancyRequirementsMap = this.vacantesIndex.get(cleanVacancyId);
    if (!vacancyRequirementsMap) {
      throw new NotFoundException('No se encontraron requisitos para la vacante indicada.');
    }

    let targetKey: string | null = null;
    let targetRequirement: RequisitoTecnico | null = null;

    for (const [key, req] of vacancyRequirementsMap.entries()) {
      if (req.id === idRequisito) {
        targetKey = key;
        targetRequirement = req;
        break;
      }
    }

    if (!targetKey || !targetRequirement) {
      throw new NotFoundException('El requisito técnico especificado no existe.');
    }

    if (dto.nivel) targetRequirement.nivel = dto.nivel;
    if (dto.tipo) targetRequirement.tipo = dto.tipo;
    if (dto.descripcion !== undefined) {
      targetRequirement.descripcion = dto.descripcion.trim() || undefined;
    }

    return { ...targetRequirement };
  }

  /**
   * Deletes a requirement from the vacancy index
   */
  eliminarRequisito(idVacante: string, idRequisito: string): { eliminado: true; id: string } {
    const cleanVacancyId = idVacante?.trim();
    const vacancyRequirementsMap = this.vacantesIndex.get(cleanVacancyId);
    if (!vacancyRequirementsMap) {
      throw new NotFoundException('No se encontraron requisitos para la vacante indicada.');
    }

    for (const [key, req] of vacancyRequirementsMap.entries()) {
      if (req.id === idRequisito) {
        vacancyRequirementsMap.delete(key);
        return { eliminado: true, id: idRequisito };
      }
    }

    throw new NotFoundException('El requisito técnico especificado no existe.');
  }

  /**
   * Clears the in-memory index for tests
   */
  limpiar(): void {
    this.vacantesIndex.clear();
  }
}
