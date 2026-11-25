import type {
  JobPostingAffinityComparison,
  JobPostingAffinityResult,
} from "@umsspira/shared-types";

export const APPLICANT_STATUSES = [
  "Postulado",
  "En revisión",
  "Preseleccionado",
  "Entrevista",
  "Descartado",
] as const;

export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

export type RequirementComparison = JobPostingAffinityComparison;

/** HU-16 (CA-07): niveles de experiencia que muestra la pestaña «Perfil». */
export const EXPERIENCE_LEVELS = ["Junior", "Semi-Senior", "Senior"] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/** HU-16 (CA-07): registros del perfil profesional que la API envía (T16.1). */
export interface WorkExperience {
  position: string;
  company: string;
  /** Fecha ISO "AAAA-MM-DD". */
  startDate: string | null;
  /** null = trabajo actual. */
  endDate: string | null;
}

export interface Education {
  title: string;
  institution: string;
  graduationYear: number | null;
  level?: string | null;
}

export interface Certification {
  name: string;
  issuer: string;
  level?: string | null;
  year: number | null;
}

export interface Applicant {
  id: string;
  name: string;
  email: string;
  status: ApplicantStatus;
  /** Fecha de postulación en formato ISO (ej. "2025-09-10"). */
  appliedAt: string | null;
  /** HU-16: true si el titulado subió su CV; se descarga con la sesión del reclutador. */
  hasCv: boolean;
  /** Enlace de descarga del CV, si la API lo envía. */
  cvUrl: string | null;
  /** HU-16 (CA-07): ubicación y nivel de experiencia del perfil (null si no los registró). */
  location?: string | null;
  experienceLevel?: ExperienceLevel | null;
  /** HU-16 (CA-07): experiencia laboral, formación académica y certificaciones. */
  workExperience?: WorkExperience[];
  education?: Education[];
  certifications?: Certification[];
  /**
   * Porcentaje devuelto por el motor de coincidencia (Epic 3/5).
   * El frontend NUNCA lo calcula. Si no viene, es null (CA-10).
   */
  matchPercentage: number | null;
  /** Estado persistido de HU-12 o resultado del cálculo por lote de HU-10. */
  matchStatus: import('@umsspira/shared-types').JobPostingStoredMatchStatus | JobPostingAffinityResult["status"] | null;
  /** Desglose por habilidad devuelto por HU-12. */
  skills?: Array<{ skill: string; required: boolean; matched: boolean }> | null;
  /** Fecha ISO recibida del cálculo por lote. Null si no hubo cálculo. */
  matchCalculatedAt: string | null;
  /** Desglose real por requisito devuelto por el motor de afinidad. */
  comparison: RequirementComparison[];
  /** Error individual del cálculo de afinidad, si el lote no pudo procesarlo. */
  matchError: string | null;
}
