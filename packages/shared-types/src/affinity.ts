export type AffinityCalculationStatus =
  | 'SUCCESS'                  // Cálculo exitoso con porcentaje válido
  | 'INCOMPLETE_PROFILE'        // Perfil profesional con datos insuficientes
  | 'INSUFFICIENT_REQUIREMENTS' // La vacante no tiene requisitos para comparar
  | 'NLP_ERROR';               // Falla controlada en el servicio de procesamiento NLP

export type SkillMatchType = 'Exacta' | 'Similar - NLP' | 'No encontrada';

export interface MatchedSkill {
  competencia: string;
  nivelRequerido: string;
  tipo: 'Obligatorio' | 'Deseable';
  coincide: boolean;
  tipoResultado: SkillMatchType;
  habilidadPerfil?: string;
  score?: number; // 0.0 a 1.0
}

export interface AffinityBreakdown {
  totalRequisitos: number;
  obligatoriosCumplidos: number;
  deseablesCumplidos: number;
  habilidades: MatchedSkill[];
}

export interface GraduateProfileSummary {
  id: string;
  nombre?: string;
  carrera?: string;
  competencias: string[];
  descripcionProfesional?: string;
}

export interface VacancyAffinityResponse {
  idVacante: string;
  idEgresado: string;
  porcentaje: number | null; // estrictamente 0 a 100 si SUCCESS, null en estados especiales
  estado: AffinityCalculationStatus;
  mensaje: string;
  detalles?: AffinityBreakdown;
  calculadoEn: string; // ISO 8601
}
