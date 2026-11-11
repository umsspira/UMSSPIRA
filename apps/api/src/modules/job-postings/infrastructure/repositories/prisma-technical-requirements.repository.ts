import { Injectable } from '@nestjs/common';
import {
  normalizeTechnicalCompetency,
  TECHNICAL_REQUIREMENT_LEVELS,
  TECHNICAL_REQUIREMENT_TYPES,
} from '@umsspira/shared-types';
import { AppError } from '../../../../shared/errors/app-error';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { SaveTechnicalRequirementsInput } from '../../application/contracts/technical-requirement.input';
import type { TechnicalRequirementsRepository } from '../../application/ports/technical-requirements-repository.port';
import type {
  TechnicalRequirement,
  TechnicalRequirementsForVacancy,
} from '../../domain/entities/technical-requirement.entity';

@Injectable()
export class PrismaTechnicalRequirementsRepository implements TechnicalRequirementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForVacancy(
    vacancyId: string,
    companyIds: readonly string[],
  ): Promise<TechnicalRequirementsForVacancy | null> {
    if (companyIds.length === 0) {
      return null;
    }

    const vacancy = await this.prisma.vacante.findFirst({
      where: { id: vacancyId, id_empresa: { in: [...companyIds] } },
      select: {
        id: true,
        titulo: true,
        requisitos_tecnicos: { orderBy: { competencia_normalizada: 'asc' } },
      },
    });
    return vacancy ? toVacancyRequirements(vacancy) : null;
  }

  async replaceForVacancy(
    vacancyId: string,
    companyIds: readonly string[],
    requirements: SaveTechnicalRequirementsInput,
  ): Promise<TechnicalRequirementsForVacancy | null> {
    if (companyIds.length === 0) {
      return null;
    }

    return this.prisma.$transaction(async (transaction) => {
      const vacancy = await transaction.vacante.findFirst({
        where: { id: vacancyId, id_empresa: { in: [...companyIds] } },
        select: { id: true, titulo: true },
      });
      if (!vacancy) {
        return null;
      }
      if (vacancy.titulo === null) {
        throw new AppError('INVALID_JOB_POSTING_RECORD', 'La vacante almacenada está incompleta');
      }

      await transaction.vacanteRequisitoTecnico.deleteMany({ where: { id_vacante: vacancyId } });
      if (requirements.length) {
        await transaction.vacanteRequisitoTecnico.createMany({
          data: requirements.map((requirement) => ({
            id_vacante: vacancyId,
            competencia_tecnica: requirement.competenciaTecnica.trim(),
            competencia_normalizada: normalizeTechnicalCompetency(requirement.competenciaTecnica),
            nivel_esperado: requirement.nivelEsperado,
            tipo: requirement.tipo,
            descripcion: requirement.descripcion.trim() || null,
          })),
        });
      }
      const saved = await transaction.vacanteRequisitoTecnico.findMany({
        where: { id_vacante: vacancyId },
        orderBy: { competencia_normalizada: 'asc' },
      });
      return toVacancyRequirements({ ...vacancy, requisitos_tecnicos: saved });
    });
  }
}

function toVacancyRequirements(record: {
  id: string;
  titulo: string | null;
  requisitos_tecnicos: Array<{
    id: string;
    id_vacante: string;
    competencia_tecnica: string;
    nivel_esperado: string;
    tipo: string;
    descripcion: string | null;
    creado_en: Date;
  }>;
}): TechnicalRequirementsForVacancy {
  if (record.titulo === null) {
    throw new AppError('INVALID_JOB_POSTING_RECORD', 'La vacante almacenada está incompleta');
  }
  return {
    vacancyId: record.id,
    vacancyTitle: record.titulo,
    requirements: record.requisitos_tecnicos.map((row) => ({
      id: row.id,
      vacancyId: row.id_vacante,
      competency: row.competencia_tecnica,
      expectedLevel: parseExpectedLevel(row.nivel_esperado),
      type: parseRequirementType(row.tipo),
      description: row.descripcion,
      createdAt: row.creado_en,
    })),
  };
}

function parseExpectedLevel(value: string): TechnicalRequirement['expectedLevel'] {
  const level = TECHNICAL_REQUIREMENT_LEVELS.find((candidate) => candidate === value);
  if (!level) {
    throw new AppError(
      'INVALID_TECHNICAL_REQUIREMENT_LEVEL',
      'Un requisito técnico tiene un nivel esperado no reconocido',
    );
  }
  return level;
}

function parseRequirementType(value: string): TechnicalRequirement['type'] {
  const type = TECHNICAL_REQUIREMENT_TYPES.find((candidate) => candidate === value);
  if (!type) {
    throw new AppError(
      'INVALID_TECHNICAL_REQUIREMENT_TYPE',
      'Un requisito técnico tiene un tipo no reconocido',
    );
  }
  return type;
}
