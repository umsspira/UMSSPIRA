// packages/shared-types/src/job-posting.ts

export interface JobPosting {
  id: string;
  titulo: string;
  modalidad: 'PRESENCIAL' | 'HIBRIDO' | 'REMOTO';
  nivelExperiencia: string;
  descripcionTecnica: string;
  estado: 'PUBLICADO' | 'CERRADO';
  fechaCreacion: string;
  empresaId: string;
}

export const TECHNICAL_REQUIREMENT_LEVELS = ['BASICO', 'INTERMEDIO', 'AVANZADO'] as const;

export type TechnicalRequirementLevel = (typeof TECHNICAL_REQUIREMENT_LEVELS)[number];

export const TECHNICAL_REQUIREMENT_TYPES = ['OBLIGATORIO', 'DESEABLE'] as const;

export type TechnicalRequirementType = (typeof TECHNICAL_REQUIREMENT_TYPES)[number];

export interface TechnicalRequirementInput {
  competenciaTecnica: string;
  nivelEsperado: TechnicalRequirementLevel;
  tipo: TechnicalRequirementType;
  descripcion: string;
}

export interface TechnicalRequirementItem extends TechnicalRequirementInput {
  id: string;
  fechaCreacion: string;
}

export interface TechnicalRequirementsForVacancy {
  vacanteId: string;
  vacanteTitulo: string;
  requisitos: TechnicalRequirementItem[];
}

export function normalizeTechnicalCompetency(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es');
}
