export type UUID = string;
export type DatabaseTimestamp = string;
export interface JobPostingRecord {
  id: UUID;
  id_empresa: UUID | null;
  titulo: string | null;
  salario: number | null;
  modalidad: string | null;
  estado: string | null;
  created_at: DatabaseTimestamp | null;
}
export interface JobPostingCompany {
  id: UUID;
  razon_social: string | null;
}

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

export interface JobRequirementRecord {
  id: UUID;
  id_empresa: UUID | null;
  id_modalidad: UUID | null;
  titulo: string | null;
  descripcion: string | null;
  experiencia_requerida: string | null;
  ubicacion: string | null;
  fecha_publicacion: DatabaseTimestamp | null;
  fecha_cierre: DatabaseTimestamp | null;
  estado: string | null;
}
export interface RequirementSkillRecord {
  id: UUID;
  id_area: UUID | null;
  id_requerimiento: UUID | null;
  nivel_requerimiento: string | null;
}
export interface JobPostingRequirementRecord {
  id_vacante: UUID;
  id_requerimiento_laboral: UUID;
}

export interface JobPostingWithRelations extends JobPostingRecord {
  empresa?: JobPostingCompany | null;
  requerimientos?: JobRequirementRecord[];
}
export interface CreateJobPostingInput {
  id_empresa?: UUID | null;
  titulo?: string | null;
  salario?: number | null;
  modalidad?: string | null;
  estado?: string | null;
  requerimiento_ids?: UUID[];
}
