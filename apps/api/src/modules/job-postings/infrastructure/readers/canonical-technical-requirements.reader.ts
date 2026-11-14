import { BadRequestException } from '@nestjs/common';
import type {
  PublishedTechnicalRequirement,
  PublishedTechnicalRequirementsReader,
} from '../../application/ports/published-technical-requirements-reader.port';

/** Projection of HU2/HU3's VacanteRequisitoTecnico, not a new Prisma model. */
export interface CanonicalTechnicalRequirementRow {
  id: string;
  id_vacante: string;
  competencia_tecnica: string;
  nivel_esperado: string;
  tipo: string;
  descripcion: string | null;
  creado_en: Date;
}

export interface CanonicalTechnicalRequirementsQuery {
  where: { id_vacante: string };
  select: {
    id: true;
    id_vacante: true;
    competencia_tecnica: true;
    nivel_esperado: true;
    tipo: true;
    descripcion: true;
    creado_en: true;
  };
  orderBy: { competencia_normalizada: 'asc' };
}

/**
 * Read-only boundary for the future prisma.vacanteRequisitoTecnico delegate.
 * It is intentionally not registered in production while that model is absent.
 */
export interface CanonicalTechnicalRequirementsSource {
  findMany(
    query: CanonicalTechnicalRequirementsQuery,
  ): Promise<CanonicalTechnicalRequirementRow[]>;
}

export class InvalidCanonicalTechnicalRequirementError extends Error {
  constructor() {
    super('El requisito técnico no cumple el contrato canónico de HU2/HU3.');
    this.name = 'InvalidCanonicalTechnicalRequirementError';
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CanonicalTechnicalRequirementsReader
  implements PublishedTechnicalRequirementsReader
{
  constructor(private readonly source: CanonicalTechnicalRequirementsSource) {}

  async obtenerRequisitos(vacancyId: string): Promise<PublishedTechnicalRequirement[]> {
    const id = vacancyId.trim();
    if (!UUID_PATTERN.test(id)) {
      throw new BadRequestException('El identificador de la vacante no es válido.');
    }

    const rows = await this.source.findMany({
      where: { id_vacante: id },
      select: {
        id: true,
        id_vacante: true,
        competencia_tecnica: true,
        nivel_esperado: true,
        tipo: true,
        descripcion: true,
        creado_en: true,
      },
      orderBy: { competencia_normalizada: 'asc' },
    });

    return rows.map((row) => {
      if (
        !UUID_PATTERN.test(row.id) ||
        row.id_vacante.toLowerCase() !== id.toLowerCase() ||
        !row.competencia_tecnica.trim() ||
        !(row.creado_en instanceof Date) ||
        !Number.isFinite(row.creado_en.getTime())
      ) {
        throw new InvalidCanonicalTechnicalRequirementError();
      }

      return {
        id: row.id,
        idVacante: row.id_vacante,
        competencia: row.competencia_tecnica,
        nivel: toDisplayLevel(row.nivel_esperado),
        tipo: toDisplayType(row.tipo),
        descripcion: row.descripcion ?? undefined,
        fechaCreacion: row.creado_en.toISOString(),
      };
    });
  }
}

function toDisplayLevel(value: string): PublishedTechnicalRequirement['nivel'] {
  switch (value) {
    case 'BASICO': return 'Básico';
    case 'INTERMEDIO': return 'Intermedio';
    case 'AVANZADO': return 'Avanzado';
    default: throw new InvalidCanonicalTechnicalRequirementError();
  }
}

function toDisplayType(value: string): PublishedTechnicalRequirement['tipo'] {
  switch (value) {
    case 'OBLIGATORIO': return 'Obligatorio';
    case 'DESEABLE': return 'Deseable';
    default: throw new InvalidCanonicalTechnicalRequirementError();
  }
}
