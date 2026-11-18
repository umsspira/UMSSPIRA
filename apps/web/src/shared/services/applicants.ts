import { Applicant } from "../types/applicant";

/* ============================================================
   CONFIGURACIÓN
   Los postulantes SON DATOS DE PRUEBA hasta que exista la API de la Epic 5.
   Cuando exista, en .env.local pon:
       NEXT_PUBLIC_USE_MOCK=false
       NEXT_PUBLIC_API_URL=http://localhost:3000
   ============================================================ */
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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
  location: string;
  experienceLevel: Applicant["experienceLevel"];
  status: Applicant["status"];
  appliedAt?: string | null;
  cvUrl?: string | null;
  matchPercentage?: number | null;
  skills?: Applicant["skills"];
}

function normalizeApplicant(raw: RawApplicant): Applicant {
  return {
    id: String(raw.id),
    name: raw.name,
    email: raw.email,
    location: raw.location,
    experienceLevel: raw.experienceLevel,
    status: raw.status,
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
async function apiGet(path: string): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, {
      // credentials: "include",                          // si usan cookies de sesión
      // headers: { Authorization: `Bearer ${token}` },   // si usan token
    });
  } catch {
    // Error de conexión (CA-08)
    throw new MatchEngineError();
  }
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
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

  const res = await apiGet(`/api/v1/vacancies/${vacancyId}/applicants`);
  if (!res.ok) throw new MatchEngineError(); // Error del servidor (CA-09)

  const data = await readJson(res);
  // Si la API responde { data: [...] }, usar: (data as { data: RawApplicant[] }).data
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

  const res = await apiGet(`/api/v1/vacancies/${vacancyId}/applicants/${applicantId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new MatchEngineError();

  const data = await readJson(res);
  return normalizeApplicant(data as RawApplicant);
}