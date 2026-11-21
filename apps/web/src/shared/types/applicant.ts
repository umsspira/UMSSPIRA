export const APPLICANT_STATUSES = [
  "Postulado",
  "En revisión",
  "Preseleccionado",
  "Entrevistado",
  "Descartado",
] as const;

export const EXPERIENCE_LEVELS = ["Junior", "Semi-Senior", "Senior"] as const;

export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export interface SkillMatch {
  skill: string;
  percentage: number;
}

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
  location: string | null;
  experienceLevel: ExperienceLevel | null;
  status: ApplicantStatus;
  /** Fecha de postulación en formato ISO (ej. "2025-09-10"). */
  appliedAt: string | null;
  /** Enlace de descarga del CV, si la API lo envía. */
  cvUrl: string | null;
  /** HU-16: true si el titulado subió su CV; se descarga con la sesión del reclutador. */
  hasCv?: boolean;
  /** HU-16 (CA-07): experiencia laboral, formación académica y certificaciones. */
  workExperience?: WorkExperience[];
  education?: Education[];
  certifications?: Certification[];
  /**
   * Porcentaje devuelto por el motor de coincidencia (Epic 3/5).
   * El frontend NUNCA lo calcula. Si no viene, es null (CA-10).
   */
  matchPercentage: number | null;
  /** Desglose por habilidad devuelto por el motor. null o vacío = no disponible. */
  skills: SkillMatch[] | null;
}