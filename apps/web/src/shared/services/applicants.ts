import {
  Applicant,
  ApplicantStatus,
} from "../types/applicant";
import { JOB_POSTING_AFFINITY_BATCH_LIMIT } from "@umsspira/shared-types";
import type {
  JobPostingAffinityBatchRequest,
  JobPostingAffinityBatchResponse,
} from "@umsspira/shared-types";
import { apiClient, ApiClientError } from "./api-client";

/* ============================================================
   CONFIGURACIÓN
   Los postulantes vienen de la API real de Épica 4
       GET /api/v1/vacantes/:idVacante/postulantes
   Los datos de prueba de abajo solo se usan en desarrollo o en una
   demo explícita, poniendo en apps/web/.env.local:
       NEXT_PUBLIC_USE_MOCK=true
   ============================================================ */
const USE_MOCK =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Solo para probar con datos de prueba:
//   "ok" | "empty" (CA-07) | "error" (CA-08 / CA-09)
type MockScenario = "ok" | "empty" | "error";
const MOCK_SCENARIO: MockScenario = "ok";

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
  /** HU-01: código de etapa que envía la API (postulado, en_revision, ...). */
  stage?: string | null;
  /** Etiqueta ya traducida (solo en los datos de prueba antiguos). */
  status?: Applicant["status"];
  appliedAt?: string | null;
  hasCv?: boolean;
  cvUrl?: string | null;
  matchPercentage?: number | null;
}

/** HU-04: códigos de etapa del backend → etiqueta que muestra la interfaz. */
const STAGE_LABELS: Record<string, ApplicantStatus> = {
  postulado: "Postulado",
  en_revision: "En revisión",
  preseleccionado: "Preseleccionado",
  entrevista: "Entrevista",
  descartado: "Descartado",
};

/** HU-04: etiqueta de la interfaz → código que espera el backend. */
export const STAGE_CODES: Record<ApplicantStatus, string> = {
  Postulado: "postulado",
  "En revisión": "en_revision",
  Preseleccionado: "preseleccionado",
  Entrevista: "entrevista",
  Descartado: "descartado",
};

export const STAGE_UPDATE_ERROR_MESSAGE = "No se pudo guardar la etapa. Intenta de nuevo.";

function toStatus(raw: RawApplicant): ApplicantStatus {
  if (raw.stage && STAGE_LABELS[raw.stage]) return STAGE_LABELS[raw.stage];
  return raw.status ?? "Postulado";
}

function normalizeApplicant(raw: RawApplicant): Applicant {
  return {
    id: String(raw.id),
    name: raw.name,
    email: raw.email,
    status: toStatus(raw),
    appliedAt: raw.appliedAt ?? null,
    hasCv: raw.hasCv === true,
    cvUrl: raw.cvUrl ?? null,
    // Ejemplo si la API usara otros nombres: raw.porcentaje_match
    matchPercentage:
      typeof raw.matchPercentage === "number" && Number.isFinite(raw.matchPercentage)
        ? raw.matchPercentage
        : null,
    matchStatus: null,
    matchCalculatedAt: null,
    comparison: [],
    matchError: null,
  };
}

/* ============================================================
   DATOS DE PRUEBA
   ============================================================ */
const MOCK_APPLICANTS: Applicant[] = [
  {
    id: "app-1",
    name: "Carlos Rojas",
    email: "carlos.rojas@email.com",
    status: "En revisión",
    appliedAt: "2025-09-10",
    hasCv: false,
    cvUrl: null,
    matchPercentage: 92,
    matchStatus: "ready",
    matchCalculatedAt: null,
    comparison: [
      { requirement: "Node.js", matchedSkill: "Node.js", result: "exact" },
      { requirement: "TypeScript", matchedSkill: "TypeScript", result: "exact" },
      { requirement: "Docker", matchedSkill: "Docker", result: "exact" },
    ],
    matchError: null,
  },
  {
    id: "app-2",
    name: "María López",
    email: "maria.lopez@email.com",
    status: "En revisión",
    appliedAt: "2025-09-08",
    hasCv: false,
    cvUrl: null,
    matchPercentage: 85,
    matchStatus: "ready",
    matchCalculatedAt: null,
    comparison: [
      { requirement: "Python", matchedSkill: "Python", result: "exact" },
      { requirement: "PostgreSQL", matchedSkill: "PostgreSQL", result: "exact" },
    ],
    matchError: null,
  },
  {
    id: "app-3",
    name: "Luis Fernández",
    email: "luis.fernandez@email.com",
    status: "Preseleccionado",
    appliedAt: "2025-09-06",
    hasCv: false,
    cvUrl: null,
    matchPercentage: 78,
    matchStatus: "ready",
    matchCalculatedAt: null,
    comparison: [
      { requirement: "Java", matchedSkill: "Java", result: "exact" },
      { requirement: "Spring Boot", matchedSkill: "Spring Boot", result: "exact" },
    ],
    matchError: null,
  },
  {
    id: "app-4",
    name: "Ana Torres",
    email: "ana.torres@email.com",
    status: "En revisión",
    appliedAt: "2025-09-05",
    hasCv: false,
    cvUrl: null,
    matchPercentage: 72,
    matchStatus: "ready",
    matchCalculatedAt: null,
    comparison: [
      { requirement: "JavaScript", matchedSkill: "JavaScript", result: "exact" },
      { requirement: "MongoDB", matchedSkill: "MongoDB", result: "exact" },
    ],
    matchError: null,
  },
  {
    // Caso CA-10: el motor no devolvió porcentaje
    id: "app-5",
    name: "Luis Mamani",
    email: "luis.mamani@email.com",
    status: "Postulado",
    appliedAt: "2025-09-04",
    hasCv: false,
    cvUrl: null,
    matchPercentage: null,
    matchStatus: "profile-incomplete",
    matchCalculatedAt: null,
    comparison: [],
    matchError: null,
  },
];

/* ============================================================
   FECHAS DE PRUEBA (BUG-05-01)
   Las fechas de postulación de prueba se calculan a partir de la fecha de
   publicación de la vacante, para que nunca queden antes de ella.
   Solo aplica a los datos de prueba: con la API real no se usa.
   ============================================================ */

// Cuántos días después de la publicación se postuló cada candidato de prueba
const MOCK_APPLIED_AFTER_DAYS: Record<string, number> = {
  "app-1": 6,
  "app-2": 4,
  "app-3": 2,
  "app-4": 1,
  "app-5": 0,
};

/** "2026-11-01" -> Date local (sin desfase de zona horaria). null si no es válida. */
function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [datePart] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Postulantes de prueba con fechas coherentes con la vacante:
 * nunca antes de su publicación y nunca en el futuro.
 * Si no se conoce la fecha de la vacante, se dejan las fechas originales.
 */
function getMockApplicants(vacancyPublishedAt?: string | null): Applicant[] {
  const published = parseIsoDate(vacancyPublishedAt);
  if (!published) return MOCK_APPLICANTS;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return MOCK_APPLICANTS.map((applicant) => {
    const days = MOCK_APPLIED_AFTER_DAYS[applicant.id] ?? 0;
    const applied = new Date(
      published.getFullYear(),
      published.getMonth(),
      published.getDate() + days
    );
    const notFuture = applied > today ? today : applied;
    const safe = notFuture < published ? published : notFuture;
    return { ...applicant, appliedAt: toIsoDate(safe) };
  });
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

async function getAffinityByApplicants(
  vacancyId: string,
  applicants: Applicant[],
): Promise<Applicant[]> {
  if (applicants.length === 0) return [];
  const resultByApplicant = new Map<string, Applicant>();

  for (let offset = 0; offset < applicants.length; offset += JOB_POSTING_AFFINITY_BATCH_LIMIT) {
    const chunk = applicants.slice(offset, offset + JOB_POSTING_AFFINITY_BATCH_LIMIT);
    const request: JobPostingAffinityBatchRequest = {
      mode: "applicants",
      vacancyId,
      applicationIds: chunk.map((applicant) => applicant.id),
    };
    let response: JobPostingAffinityBatchResponse;
    try {
      response = await apiClient<JobPostingAffinityBatchResponse>("/api/v1/affinity/batch", {
        method: "POST",
        authenticated: true,
        body: request,
      });
    } catch {
      throw new MatchEngineError();
    }

    if (!response || !Array.isArray(response.data)) throw new MatchEngineError();
    for (const item of response.data) {
      if (
        !item
        || item.vacancyId !== vacancyId
        || typeof item.applicationId !== "string"
        || resultByApplicant.has(item.applicationId)
      ) {
        throw new MatchEngineError();
      }
      const applicant = chunk.find((candidate) => candidate.id === item.applicationId);
      if (!applicant) throw new MatchEngineError();
      const result = item.result;
      if (
        !result
        && (!item.error || typeof item.error.message !== "string" || !item.error.message.trim())
      ) {
        throw new MatchEngineError();
      }
      if (result) {
        if (!Array.isArray(result.comparison)) throw new MatchEngineError();
        const invalidComparison = result.comparison.some((comparison) =>
          !comparison
          || typeof comparison.requirement !== "string"
          || (comparison.matchedSkill !== null && typeof comparison.matchedSkill !== "string")
          || (
            comparison.result !== "exact"
            && comparison.result !== "similar"
            && comparison.result !== "not-found"
          ),
        );
        if (
          invalidComparison
          || (
            result.status !== "ready"
            && result.status !== "profile-incomplete"
            && result.status !== "no-requirements"
          )
        ) {
          throw new MatchEngineError();
        }
        if (
          result.status === "ready"
          ? typeof result.percentage !== "number"
            || !Number.isFinite(result.percentage)
            || result.percentage < 0
            || result.percentage > 100
            || typeof result.calculatedAt !== "string"
            || !Number.isFinite(Date.parse(result.calculatedAt))
          : result.percentage !== null
            || result.calculatedAt !== null
            || result.comparison.length !== 0
        ) {
          throw new MatchEngineError();
        }
      }
      resultByApplicant.set(item.applicationId, {
        ...applicant,
        matchPercentage: result?.percentage ?? null,
        matchStatus: result?.status ?? null,
        matchCalculatedAt: result?.calculatedAt ?? null,
        comparison: result?.comparison ?? [],
        matchError: item.error?.message ?? null,
      });
    }
    if (chunk.some((applicant) => !resultByApplicant.has(applicant.id))) {
      throw new MatchEngineError();
    }
  }

  const enriched = applicants.map((applicant, index) => {
    const result = resultByApplicant.get(applicant.id);
    if (!result) throw new MatchEngineError();
    return { applicant: result, index };
  });
  return enriched
    .sort((a, b) => {
      const aMatch = a.applicant.matchPercentage;
      const bMatch = b.applicant.matchPercentage;
      if (aMatch === null) return bMatch === null ? a.index - b.index : 1;
      if (bMatch === null) return -1;
      return bMatch - aMatch || a.index - b.index;
    })
    .map(({ applicant }) => applicant);
}

/* ============================================================
   SERVICIO PÚBLICO (lanzan MatchEngineError si fallan)
   El parámetro vacancyPublishedAt solo se usa con datos de prueba.
   ============================================================ */

/** Lista de postulantes de una vacante. */
export async function getApplicantsByVacancy(
  vacancyId: string,
  vacancyPublishedAt?: string | null
): Promise<Applicant[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (MOCK_SCENARIO === "error") throw new MatchEngineError();
    if (MOCK_SCENARIO === "empty") return [];
    return getMockApplicants(vacancyPublishedAt);
  }

  let data: unknown;
  try {
    data = await apiGet<unknown>(`/api/v1/vacantes/${encodeURIComponent(vacancyId)}/postulantes`);
  } catch (error) {
    // Vacante inexistente o de otra empresa: se trata como error de carga (CA-09).
    if (error instanceof ApiClientError) throw new MatchEngineError();
    throw error;
  }
  if (!Array.isArray(data)) throw new MatchEngineError();

  return getAffinityByApplicants(vacancyId, (data as RawApplicant[]).map(normalizeApplicant));
}

/** Detalle de un postulante. Devuelve null si no existe. */
export async function getApplicantById(
  vacancyId: string,
  applicantId: string,
  vacancyPublishedAt?: string | null
): Promise<Applicant | null> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (MOCK_SCENARIO === "error") throw new MatchEngineError();
    return getMockApplicants(vacancyPublishedAt).find((a) => a.id === applicantId) ?? null;
  }

  try {
    const data = await apiGet<RawApplicant>(
      `/api/v1/vacantes/${encodeURIComponent(vacancyId)}/postulantes/${encodeURIComponent(applicantId)}`
    );
    return (await getAffinityByApplicants(vacancyId, [normalizeApplicant(data)]))[0] ?? null;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return null;
    throw error;
  }
}

/**
 * HU-04: cambia la etapa de un postulante.
 * Usa apiClient para enviar la sesión (Bearer) igual que el resto de la app;
 * un fetch directo con cookie sin X-CSRF-Token responde 403.
 */
export async function updateApplicantStage(
  vacancyId: string,
  applicantId: string,
  status: ApplicantStatus
): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return;
  }

  try {
    await apiClient(
      `/api/v1/vacantes/${encodeURIComponent(vacancyId)}/postulantes/${encodeURIComponent(applicantId)}/etapa`,
      { method: "PATCH", authenticated: true, body: { etapa: STAGE_CODES[status] } }
    );
  } catch (error) {
    if (error instanceof ApiClientError && error.status < 500 && error.message) {
      throw new Error(error.message);
    }
    throw new Error(STAGE_UPDATE_ERROR_MESSAGE);
  }
}
