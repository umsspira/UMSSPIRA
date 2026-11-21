import { Applicant, ApplicantStatus, EXPERIENCE_LEVELS, ExperienceLevel } from "../types/applicant";
import { apiClient, ApiClientError } from "./api-client";

export const MATCH_ENGINE_ERROR_MESSAGE = "Error de conexión con el motor de coincidencia";

export class MatchEngineError extends Error {
  constructor(message = MATCH_ENGINE_ERROR_MESSAGE) {
    super(message);
    this.name = "MatchEngineError";
  }
}

/* ============================================================
   ÚNICO PUNTO DE ADAPTACIÓN DE LA RESPUESTA
   Si la API usa otros nombres de campo, solo se cambia aquí.
   Nunca se calcula ni se inventa el porcentaje (CA-02, CA-10).
   ============================================================ */
interface RawApplicant {
  id: string | number;
  name: string;
  email: string;
  location?: string | null;
  experienceLevel?: string | null;
  /** HU-01: código de etapa que envía la API (postulado, en_revision, ...). */
  stage?: string | null;
  /** Etiqueta ya traducida (solo en los datos de prueba antiguos). */
  status?: Applicant["status"];
  appliedAt?: string | null;
  cvUrl?: string | null;
  matchPercentage?: number | null;
  skills?: Applicant["skills"];
}

/** HU-04: códigos de etapa del backend → etiqueta que muestra la interfaz. */
const STAGE_LABELS: Record<string, ApplicantStatus> = {
  postulado: "Postulado",
  en_revision: "En revisión",
  preseleccionado: "Preseleccionado",
  entrevista: "Entrevistado",
  descartado: "Descartado",
};

function toStatus(raw: RawApplicant): ApplicantStatus {
  if (raw.stage && STAGE_LABELS[raw.stage]) return STAGE_LABELS[raw.stage];
  return raw.status ?? "Postulado";
}

function toExperienceLevel(value: unknown): ExperienceLevel | null {
  return (EXPERIENCE_LEVELS as readonly string[]).includes(String(value))
    ? (value as ExperienceLevel)
    : null;
}

function normalizeApplicant(raw: RawApplicant): Applicant {
  return {
    id: String(raw.id),
    name: raw.name,
    email: raw.email,
    // El perfil del titulado aún no registra ubicación ni nivel: se muestran como no registrados.
    location: raw.location || null,
    experienceLevel: toExperienceLevel(raw.experienceLevel),
    status: toStatus(raw),
    appliedAt: raw.appliedAt ?? null,
    cvUrl: raw.cvUrl ?? null,
    // Ejemplo si la API usara otros nombres: raw.porcentaje_match
    matchPercentage:
      typeof raw.matchPercentage === "number" && Number.isFinite(raw.matchPercentage)
        ? raw.matchPercentage
        : null,
    skills: Array.isArray(raw.skills) ? raw.skills : null,
  };
}

/* ============================================================
   HELPERS DE RED
   ============================================================ */
/** Llama a la API con la sesión del usuario (token, renovación y errores comunes). */
async function apiGet<T>(path: string): Promise<T> {
  try {
    return await apiClient<T>(path, { method: "GET", authenticated: true });
  } catch (error) {
    // Se conserva el 404 para que el detalle pueda responder "no encontrado".
    if (error instanceof ApiClientError && error.status === 404) throw error;
    // Error de conexión (CA-08) o del servidor (CA-09)
    throw new MatchEngineError();
  }
}

/* ============================================================
   SERVICIO PÚBLICO (lanzan MatchEngineError si fallan)
   ============================================================ */

/** Lista de postulantes de una vacante. */
export async function getApplicantsByVacancy(
  vacancyId: string,
): Promise<Applicant[]> {
  let data: unknown;
  try {
    data = await apiGet<unknown>(`/api/v1/vacantes/${encodeURIComponent(vacancyId)}/postulantes`);
  } catch (error) {
    // Vacante inexistente o de otra empresa: se trata como error de carga (CA-09).
    if (error instanceof ApiClientError) throw new MatchEngineError();
    throw error;
  }
  if (!Array.isArray(data)) throw new MatchEngineError();

  return (data as RawApplicant[]).map(normalizeApplicant);
}

/** Detalle de un postulante. Devuelve null si no existe. */
export async function getApplicantById(
  vacancyId: string,
  applicantId: string,
): Promise<Applicant | null> {
  try {
    const data = await apiGet<RawApplicant>(
      `/api/v1/vacantes/${encodeURIComponent(vacancyId)}/postulantes/${encodeURIComponent(applicantId)}`
    );
    return normalizeApplicant(data);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return null;
    throw error;
  }
}