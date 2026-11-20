import {
  Applicant,
  ApplicantStatus,
  Certification,
  Education,
  EXPERIENCE_LEVELS,
  ExperienceLevel,
  WorkExperience,
} from "../types/applicant";
import { apiClient, ApiClientError } from "./api-client";
import { authenticatedFetch } from "./auth-session";

/* ============================================================
   CONFIGURACIÓN
   HU-01 (Sprint 3): los postulantes vienen de la API real de Épica 4
       GET /api/v1/vacantes/:idVacante/postulantes
   Épica 5 (regla 7 del README): los datos de prueba quedan apagados
   por defecto. Solo para desarrollo o una demo explícita, en
   apps/web/.env.local pon:
       NEXT_PUBLIC_USE_MOCK=true
   ============================================================ */
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

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
  location?: string | null;
  experienceLevel?: string | null;
  /** HU-01: código de etapa que envía la API (postulado, en_revision, ...). */
  stage?: string | null;
  /** Etiqueta ya traducida (solo en los datos de prueba antiguos). */
  status?: Applicant["status"];
  appliedAt?: string | null;
  /** HU-16: la API indica si el titulado subió su CV. */
  hasCv?: boolean | null;
  cvUrl?: string | null;
  matchPercentage?: number | null;
  skills?: Applicant["skills"];
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
    // El perfil del titulado aún no registra ubicación ni nivel: se muestran como no registrados.
    location: raw.location || null,
    experienceLevel: toExperienceLevel(raw.experienceLevel),
    status: toStatus(raw),
    appliedAt: raw.appliedAt ?? null,
    cvUrl: raw.cvUrl ?? null,
    hasCv: raw.hasCv === true,
    // Ejemplo si la API usara otros nombres: raw.porcentaje_match
    matchPercentage:
      typeof raw.matchPercentage === "number" && Number.isFinite(raw.matchPercentage)
        ? raw.matchPercentage
        : null,
    skills: Array.isArray(raw.skills) ? raw.skills : null,
    workExperience: toWorkExperience(raw.workExperience),
    education: toEducation(raw.education),
    certifications: toCertifications(raw.certifications),
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
    location: "Cochabamba, Bolivia",
    experienceLevel: "Senior",
    status: "En revisión",
    appliedAt: "2025-09-10",
    cvUrl: null,
    matchPercentage: 92,
    skills: [
      { skill: "Node.js", percentage: 100 },
      { skill: "TypeScript", percentage: 90 },
      { skill: "REST API", percentage: 80 },
      { skill: "PostgreSQL", percentage: 80 },
      { skill: "Docker", percentage: 70 },
      { skill: "AWS", percentage: 60 },
    ],
  },
  {
    id: "app-2",
    name: "María López",
    email: "maria.lopez@email.com",
    location: "Cochabamba, Bolivia",
    experienceLevel: "Senior",
    status: "En revisión",
    appliedAt: "2025-09-08",
    cvUrl: null,
    matchPercentage: 85,
    skills: [
      { skill: "Python", percentage: 95 },
      { skill: "FastAPI", percentage: 90 },
      { skill: "PostgreSQL", percentage: 80 },
      { skill: "Docker", percentage: 75 },
    ],
  },
  {
    id: "app-3",
    name: "Luis Fernández",
    email: "luis.fernandez@email.com",
    location: "Quillacollo, Cochabamba",
    experienceLevel: "Semi-Senior",
    status: "Preseleccionado",
    appliedAt: "2025-09-06",
    cvUrl: null,
    matchPercentage: 78,
    skills: [
      { skill: "Java", percentage: 85 },
      { skill: "Spring Boot", percentage: 80 },
      { skill: "MySQL", percentage: 75 },
      { skill: "Docker", percentage: 65 },
    ],
  },
  {
    id: "app-4",
    name: "Ana Torres",
    email: "ana.torres@email.com",
    location: "Cochabamba, Bolivia",
    experienceLevel: "Semi-Senior",
    status: "En revisión",
    appliedAt: "2025-09-05",
    cvUrl: null,
    matchPercentage: 72,
    skills: [
      { skill: "Node.js", percentage: 80 },
      { skill: "JavaScript", percentage: 75 },
      { skill: "MongoDB", percentage: 70 },
      { skill: "REST API", percentage: 65 },
    ],
  },
  {
    // Caso CA-10: el motor no devolvió porcentaje
    id: "app-5",
    name: "Luis Mamani",
    email: "luis.mamani@email.com",
    location: "Sacaba, Cochabamba",
    experienceLevel: "Junior",
    status: "Postulado",
    appliedAt: "2025-09-04",
    cvUrl: null,
    matchPercentage: null,
    skills: null,
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

  return (data as RawApplicant[]).map(normalizeApplicant);
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
    return normalizeApplicant(data);
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