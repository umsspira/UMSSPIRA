import { Injectable } from '@nestjs/common';
import {
  normalizeTechnicalCompetency,
  TECHNICAL_REQUIREMENT_LEVELS,
  TECHNICAL_REQUIREMENT_TYPES,
} from '@umsspira/shared-types';
import { Prisma } from '../../../../generated/prisma/client';
import { AppError } from '../../../../shared/errors/app-error';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { SaveTechnicalRequirementsInput } from '../../application/contracts/technical-requirement.input';
import type { TechnicalRequirementsRepository } from '../../application/ports/technical-requirements-repository.port';
import type {
  TechnicalRequirement,
  TechnicalRequirementsForVacancy,
} from '../../domain/entities/technical-requirement.entity';
import { TechnicalRequirementsSchemaNotAppliedError } from '../../domain/errors/technical-requirement.errors';

interface VacancyRow {
  vacancyId: string;
  vacancyTitle: string | null;
}

interface RequirementRow {
  id: string;
  competency: string;
  expectedLevel: string;
  type: string;
  description: string | null;
  createdAt: Date;
}

interface JoinedRequirementRow extends VacancyRow {
  requirementId: string | null;
  competency: string | null;
  expectedLevel: string | null;
  type: string | null;
  description: string | null;
  createdAt: Date | null;
}

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

    try {
      const rows = await this.prisma.$queryRaw<JoinedRequirementRow[]>(Prisma.sql`
        SELECT
          v.id AS "vacancyId",
          v.titulo AS "vacancyTitle",
          r.id AS "requirementId",
          r.competencia_tecnica AS "competency",
          r.nivel_esperado AS "expectedLevel",
          r.tipo AS "type",
          r.descripcion AS "description",
          r.creado_en AS "createdAt"
        FROM public.vacante AS v
        LEFT JOIN public.vacante_requisito_tecnico AS r ON r.id_vacante = v.id
        WHERE v.id = ${vacancyId}::uuid
          AND v.id_empresa IN (${Prisma.join(companyIds.map((id) => Prisma.sql`${id}::uuid`))})
        ORDER BY r.competencia_normalizada ASC NULLS LAST
      `);
      return toVacancyRequirements(rows);
    } catch (error) {
      this.throwIfRequirementsSchemaIsMissing(error);
      throw error;
    }
  }

  async replaceForVacancy(
    vacancyId: string,
    companyIds: readonly string[],
    requirements: SaveTechnicalRequirementsInput,
  ): Promise<TechnicalRequirementsForVacancy | null> {
    if (companyIds.length === 0) {
      return null;
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const vacancyRows = await transaction.$queryRaw<VacancyRow[]>(Prisma.sql`
          SELECT v.id AS "vacancyId", v.titulo AS "vacancyTitle"
          FROM public.vacante AS v
          WHERE v.id = ${vacancyId}::uuid
            AND v.id_empresa IN (${Prisma.join(companyIds.map((id) => Prisma.sql`${id}::uuid`))})
          FOR UPDATE
        `);
        const vacancy = vacancyRows[0];
        if (!vacancy) {
          return null;
        }
        if (vacancy.vacancyTitle === null) {
          throw new AppError('INVALID_JOB_POSTING_RECORD', 'La vacante almacenada está incompleta');
        }

        await transaction.$executeRaw`
          DELETE FROM public.vacante_requisito_tecnico
          WHERE id_vacante = ${vacancyId}::uuid
        `;

        const requirementRows = await this.insertRequirements(transaction, vacancyId, requirements);

        return {
          vacancyId: vacancy.vacancyId,
          vacancyTitle: vacancy.vacancyTitle,
          requirements: requirementRows
            .map(toTechnicalRequirement(vacancyId))
            .sort((left, right) => left.competency.localeCompare(right.competency, 'es')),
        };
      });
    } catch (error) {
      this.throwIfRequirementsSchemaIsMissing(error);
      throw error;
    }
  }

  private async insertRequirements(
    transaction: Prisma.TransactionClient,
    vacancyId: string,
    requirements: SaveTechnicalRequirementsInput,
  ): Promise<RequirementRow[]> {
    if (requirements.length === 0) {
      return [];
    }

    const values = Prisma.join(
      requirements.map(
        (requirement) => Prisma.sql`(
          gen_random_uuid(),
          ${vacancyId}::uuid,
          ${requirement.competenciaTecnica.trim()},
          ${normalizeTechnicalCompetency(requirement.competenciaTecnica)},
          ${requirement.nivelEsperado},
          ${requirement.tipo},
          ${requirement.descripcion.trim() || null},
          now(),
          now()
        )`,
      ),
    );

    return transaction.$queryRaw<RequirementRow[]>(Prisma.sql`
      INSERT INTO public.vacante_requisito_tecnico (
        id,
        id_vacante,
        competencia_tecnica,
        competencia_normalizada,
        nivel_esperado,
        tipo,
        descripcion,
        creado_en,
        actualizado_en
      )
      VALUES ${values}
      RETURNING
        id,
        competencia_tecnica AS competency,
        nivel_esperado AS "expectedLevel",
        tipo AS "type",
        descripcion AS description,
        creado_en AS "createdAt"
    `);
  }

  private throwIfRequirementsSchemaIsMissing(error: unknown): void {
    if (databaseErrorHasCode(error, '42P01')) {
      throw new TechnicalRequirementsSchemaNotAppliedError();
    }
  }
}

function toVacancyRequirements(
  rows: JoinedRequirementRow[],
): TechnicalRequirementsForVacancy | null {
  const first = rows[0];
  if (!first) {
    return null;
  }
  if (first.vacancyTitle === null) {
    throw new AppError('INVALID_JOB_POSTING_RECORD', 'La vacante almacenada está incompleta');
  }

  const requirements = rows
    .filter(
      (row): row is JoinedRequirementRow & { requirementId: string } => row.requirementId !== null,
    )
    .map((row) => {
      if (
        row.competency === null ||
        row.expectedLevel === null ||
        row.type === null ||
        row.createdAt === null
      ) {
        throw new AppError(
          'INVALID_TECHNICAL_REQUIREMENT_RECORD',
          'Un requisito técnico almacenado está incompleto',
        );
      }
      return {
        id: row.requirementId,
        vacancyId: row.vacancyId,
        competency: row.competency,
        expectedLevel: parseExpectedLevel(row.expectedLevel),
        type: parseRequirementType(row.type),
        description: row.description,
        createdAt: row.createdAt,
      };
    });

  return {
    vacancyId: first.vacancyId,
    vacancyTitle: first.vacancyTitle,
    requirements,
  };
}

function toTechnicalRequirement(vacancyId: string) {
  return (row: RequirementRow): TechnicalRequirement => ({
    id: row.id,
    vacancyId,
    competency: row.competency,
    expectedLevel: parseExpectedLevel(row.expectedLevel),
    type: parseRequirementType(row.type),
    description: row.description,
    createdAt: row.createdAt,
  });
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

function databaseErrorHasCode(error: unknown, code: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const value = error as Record<string, unknown>;
  if (value.code === code) {
    return true;
  }
  if (typeof value.meta === 'object' && value.meta !== null) {
    const metadata = value.meta as Record<string, unknown>;
    if (metadata.code === code) {
      return true;
    }
  }
  if (typeof value.cause === 'object' && value.cause !== null) {
    const cause = value.cause as Record<string, unknown>;
    return cause.code === code;
  }
  return false;
}
