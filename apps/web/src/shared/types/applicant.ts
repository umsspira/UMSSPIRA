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

export interface Applicant {
  id: string;
  name: string;
  email: string;
  status: ApplicantStatus;
  /** Fecha de postulación en formato ISO (ej. "2025-09-10"). */
  appliedAt: string | null;
  hasCv: boolean;
  /** Enlace de descarga del CV, si la API lo envía. */
  cvUrl: string | null;
  /**
   * Porcentaje devuelto por el motor de coincidencia (Epic 3/5).
   * El frontend NUNCA lo calcula. Si no viene, es null (CA-10).
   */
  matchPercentage: number | null;
  matchStatus: JobPostingAffinityResult["status"] | null;
  /** Fecha ISO recibida del cálculo por lote. Null si no hubo cálculo. */
  matchCalculatedAt: string | null;
  /** Desglose real por requisito devuelto por el motor de afinidad. */
  comparison: RequirementComparison[];
  /** Error individual del cálculo de afinidad, si el lote no pudo procesarlo. */
  matchError: string | null;
}