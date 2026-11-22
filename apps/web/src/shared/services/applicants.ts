import {
  Applicant,
  ApplicantStatus,
  Certification,
  Education,
  EXPERIENCE_LEVELS,
  ExperienceLevel,
  WorkExperience,
} from "../types/applicant";
import { JOB_POSTING_AFFINITY_BATCH_LIMIT } from "@umsspira/shared-types";
import type {
  JobPostingAffinityBatchItem,
  JobPostingAffinityBatchRequest,
  JobPostingAffinityBatchResponse,
  JobPostingAffinityResult,
} from "@umsspira/shared-types";
import { apiClient, ApiClientError } from "./api-client";
import { authenticatedFetch } from "./auth-session";

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
  /** HU-16: la API indica si el titulado subió su CV. */
  hasCv?: boolean | null;
  cvUrl?: string | null;
  matchPercentage?: number | null;
  /** HU-10: fecha del último cálculo guardado (fecha_match). */
  matchCalculatedAt?: string | null;
  /** HU-16 (CA-07): ubicación y nivel de experiencia del perfil. */
  location?: string | null;
  experienceLevel?: string | null;
  /** HU-16 (CA-07, T16.1): registros del perfil profesional. */
  workExperience?: unknown;
  education?: unknown;
  certifications?: unknown;
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

function toExperienceLevel(value: unknown): ExperienceLevel | null {
  return (EXPERIENCE_LEVELS as readonly string[]).includes(String(value))
    ? (value as ExperienceLevel)
    : null;
}

/* HU-16 (CA-07): se aceptan solo los registros bien formados que envía la API. */
type RawRecord = Record<string, unknown>;

function toRecords(value: unknown): RawRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is RawRecord => typeof item === "object" && item !== null)
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | null {
  return text(value) || null;
}

function optionalYear(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toWorkExperience(value: unknown): WorkExperience[] {
  return toRecords(value)
    .map((r) => ({
      position: text(r.position),
      company: text(r.company),
      startDate: optionalText(r.startDate),
      endDate: optionalText(r.endDate),
    }))
    .filter((r) => r.position || r.company);
}

function toEducation(value: unknown): Education[] {
  return toRecords(value)
    .map((r) => ({
      title: text(r.title),
      institution: text(r.institution),
      graduationYear: optionalYear(r.graduationYear),
      level: optionalText(r.level),
    }))
    .filter((r) => r.title || r.institution);
}

function toCertifications(value: unknown): Certification[] {
  return toRecords(value)
    .map((r) => ({
      name: text(r.name),
      issuer: text(r.issuer),
      level: optionalText(r.level),
      year: optionalYear(r.year),
    }))
    .filter((r) => r.name);
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
    location: typeof raw.location === "string" && raw.location.trim() ? raw.location : null,
    experienceLevel: toExperienceLevel(raw.experienceLevel),
    workExperience: toWorkExperience(raw.workExperience),
    education: toEducation(raw.education),
    certifications: toCertifications(raw.certifications),
    matchStatus: null,
    matchCalculatedAt:
      typeof raw.matchCalculatedAt === "string" && Number.isFinite(Date.parse(raw.matchCalculatedAt))
        ? raw.matchCalculatedAt
        : null,
    comparison: [],
    matchError: null,
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

/** Si el motor no responde, la lista sigue visible con el último porcentaje guardado. */
export const AFFINITY_UNAVAILABLE_MESSAGE =
  "No se pudo calcular la coincidencia técnica en este momento. Se muestra el último resultado guardado, si existe.";

const COMPARISON_RESULTS = ["exact", "similar", "not-found"] as const;

function isValidAffinityResult(result: unknown): result is JobPostingAffinityResult {
  if (!result || typeof result !== "object") return false;
  const r = result as Record<string, unknown>;
  if (!Array.isArray(r.comparison)) return false;
  const comparisonOk = r.comparison.every((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const c = item as Record<string, unknown>;
    return (
      typeof c.requirement === "string"
      && (c.matchedSkill === null || typeof c.matchedSkill === "string")
      && (COMPARISON_RESULTS as readonly unknown[]).includes(c.result)
    );
  });
  if (!comparisonOk) return false;
  if (r.status === "ready") {
    return (
      typeof r.percentage === "number"
      && Number.isFinite(r.percentage)
      && r.percentage >= 0
      && r.percentage <= 100
      && typeof r.calculatedAt === "string"
      && Number.isFinite(Date.parse(r.calculatedAt))
    );
  }
  return (
    (r.status === "profile-incomplete" || r.status === "no-requirements")
    && r.percentage === null
    && r.calculatedAt === null
    && r.comparison.length === 0
  );
}

/** Conserva el porcentaje y la fecha guardados (GET postulantes) y solo marca el error. */
function withAffinityError(applicant: Applicant, message: string): Applicant {
  return { ...applicant, matchStatus: null, comparison: [], matchError: message };
}

function applyBatchItem(applicant: Applicant, item: JobPostingAffinityBatchItem): Applicant {
  if (item.result && isValidAffinityResult(item.result)) {
    return {
      ...applicant,
      matchPercentage: item.result.percentage,
      matchStatus: item.result.status,
      matchCalculatedAt: item.result.calculatedAt,
      comparison: item.result.comparison,
      matchError: null,
    };
  }
  const message =
    item.error && typeof item.error.message === "string" && item.error.message.trim()
      ? item.error.message
      : AFFINITY_UNAVAILABLE_MESSAGE;
  return withAffinityError(applicant, message);
}

async function requestAffinityChunk(
  vacancyId: string,
  chunk: Applicant[],
): Promise<Map<string, JobPostingAffinityBatchItem>> {
  const request: JobPostingAffinityBatchRequest = {
    mode: "applicants",
    vacancyId,
    applicationIds: chunk.map((applicant) => applicant.id),
  };
  const response = await apiClient<JobPostingAffinityBatchResponse>("/api/v1/affinity/batch", {
    method: "POST",
    authenticated: true,
    body: request,
  });
  const items = new Map<string, JobPostingAffinityBatchItem>();
  if (!response || !Array.isArray(response.data)) return items;
  const ids = new Set(request.applicationIds);
  for (const item of response.data) {
    // Se ignoran elementos de otra vacante, desconocidos o repetidos.
    if (
      item
      && item.vacancyId === vacancyId
      && typeof item.applicationId === "string"
      && ids.has(item.applicationId)
      && !items.has(item.applicationId)
    ) {
      items.set(item.applicationId, item);
    }
  }
  return items;
}

async function getAffinityByApplicants(
  vacancyId: string,
  applicants: Applicant[],
): Promise<Applicant[]> {
  if (applicants.length === 0) return [];
  const enriched: Applicant[] = [];

  for (let offset = 0; offset < applicants.length; offset += JOB_POSTING_AFFINITY_BATCH_LIMIT) {
    const chunk = applicants.slice(offset, offset + JOB_POSTING_AFFINITY_BATCH_LIMIT);
    let items: Map<string, JobPostingAffinityBatchItem> | null = null;
    try {
      items = await requestAffinityChunk(vacancyId, chunk);
    } catch {
      items = null; // HU-10 caído o no disponible: la lista se muestra igual.
    }
    for (const applicant of chunk) {
      const item = items?.get(applicant.id);
      enriched.push(item ? applyBatchItem(applicant, item) : withAffinityError(applicant, AFFINITY_UNAVAILABLE_MESSAGE));
    }
  }

  return enriched
    .map((applicant, index) => ({ applicant, index }))
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

  return getAffinityByApplicants(vacancyId, (data as RawApplicant[]).map(normalizeApplicant));
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
    return (await getAffinityByApplicants(vacancyId, [normalizeApplicant(data)]))[0] ?? null;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return null;
    throw error;
  }
}


/* ============================================================
   HU-16 · DESCARGA DEL CV (T16.4)
   GET /api/v1/vacantes/:idVacante/postulantes/:idPostulacion/cv (T16.2)
   Se pide con la sesión del reclutador (no es un enlace público).
   ============================================================ */
export const CV_DOWNLOAD_ERROR_MESSAGE = "No se pudo descargar el CV. Intente nuevamente";

export class CvDownloadError extends Error {
  constructor(message = CV_DOWNLOAD_ERROR_MESSAGE) {
    super(message);
    this.name = "CvDownloadError";
  }
}

/** Nombre del archivo descargado: «CV - <nombre del postulante>.pdf» (CA-09). */
export function buildCvFileName(applicantName: string): string {
  const clean = applicantName.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  return `CV - ${clean || "postulante"}.pdf`;
}

/** Pide el CV del postulante y lo descarga en el navegador. */
export async function downloadApplicantCv(
  vacancyId: string,
  applicationId: string,
  applicantName: string
): Promise<void> {
  const path = `/api/v1/vacantes/${encodeURIComponent(vacancyId)}/postulantes/${encodeURIComponent(applicationId)}/cv`;

  let response: Response;
  try {
    response = await authenticatedFetch(path, { method: "GET" });
  } catch {
    throw new CvDownloadError();
  }
  if (!response.ok) throw new CvDownloadError();

  const blob = await response.blob().catch(() => null);
  if (!blob || blob.size === 0) throw new CvDownloadError();

  const url = URL.createObjectURL(
    blob.type ? blob : new Blob([blob], { type: "application/pdf" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = buildCvFileName(applicantName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Se libera más tarde: algunos navegadores cancelan la descarga si se libera en el acto.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
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

