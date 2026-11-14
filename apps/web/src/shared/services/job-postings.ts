import { ApiError, apiFetch } from "./api-client";
import { getCurrentCompanyId } from "./companies";

export interface JobPostingRequirement {
  id?: string;
  vacancyId?: string;
  name: string;
  level: string | null;
  type?: string | null;
  description?: string | null;
  createdAt?: string;
  areaId?: string | null;
}

export interface JobPosting {
  id: string;
  title: string | null;
  modality: string | null;
  experienceLevel: string | null;
  technicalDescription: string | null;
  publishedAt: string | null;
  company: {
    name: string | null;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
  } | null;
  technicalRequirements: JobPostingRequirement[];
}

export interface JobPostingDetail extends JobPosting {
  affinityPercentage: number | null;
  affinityMessage: string | null;
}

interface ApiTechnicalRequirement {
  id?: string;
  idVacante?: string;
  competencia?: string;
  nivel: string | null;
  tipo?: string;
  descripcion?: string | null;
  fechaCreacion?: string;
  areaId?: string | null;
  nombre?: string;
}

interface ApiJobPosting {
  id: string;
  titulo: string | null;
  modalidad: string | null;
  nivelExperiencia: string | null;
  descripcionTecnica: string | null;
  fechaPublicacion: string | null;
  empresa: {
    razonSocial: string | null;
    descripcion: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
  } | null;
  requisitosTecnicos: ApiTechnicalRequirement[];
  porcentajeAfinidad?: number | null;
  mensajeAfinidad?: string | null;
}

export interface CreateJobPostingInput {
  titulo: string;
  modalidad: string;
  nivelExperiencia: string;
  descripcionTecnica: string;
}

function adaptJobPosting(posting: ApiJobPosting): JobPosting {
  return {
    id: posting.id,
    title: posting.titulo,
    modality: posting.modalidad,
    experienceLevel: posting.nivelExperiencia,
    technicalDescription: posting.descripcionTecnica,
    publishedAt: posting.fechaPublicacion,
    company: posting.empresa
      ? {
          name: posting.empresa.razonSocial,
          description: posting.empresa.descripcion,
          logoUrl: posting.empresa.logoUrl,
          bannerUrl: posting.empresa.bannerUrl,
        }
      : null,
    technicalRequirements: posting.requisitosTecnicos.map((requirement) => ({
      id: requirement.id,
      vacancyId: requirement.idVacante,
      areaId: requirement.areaId,
      name: requirement.competencia ?? requirement.nombre ?? "",
      level: requirement.nivel,
      type: requirement.tipo,
      description: requirement.descripcion,
      createdAt: requirement.fechaCreacion,
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isDetailResponse(value: unknown, requestedId: string): value is ApiJobPosting {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    !nullableString(value.titulo) ||
    !nullableString(value.modalidad) ||
    !nullableString(value.nivelExperiencia) ||
    !nullableString(value.descripcionTecnica) ||
    !nullableString(value.fechaPublicacion) ||
    !Array.isArray(value.requisitosTecnicos) ||
    !(value.porcentajeAfinidad === undefined || value.porcentajeAfinidad === null ||
      (typeof value.porcentajeAfinidad === "number" &&
        Number.isFinite(value.porcentajeAfinidad) &&
        value.porcentajeAfinidad >= 0 && value.porcentajeAfinidad <= 100)) ||
    !(value.mensajeAfinidad === undefined || nullableString(value.mensajeAfinidad))
  ) return false;

  const company = value.empresa;
  if (company !== null && (!isRecord(company) ||
    !nullableString(company.razonSocial) || !nullableString(company.descripcion) ||
    !nullableString(company.logoUrl) || !nullableString(company.bannerUrl))) return false;

  const requirementIds = new Set<string>();
  return value.requisitosTecnicos.every((item: unknown) => {
    if (!isRecord(item)) return false;
    const valid =
      typeof item.id === "string" &&
      !requirementIds.has(item.id) &&
      typeof item.idVacante === "string" &&
      item.idVacante.toLowerCase() === requestedId.toLowerCase() &&
      typeof item.competencia === "string" &&
      item.competencia.trim().length > 0 &&
      ["Básico", "Intermedio", "Avanzado", "Experto"].includes(String(item.nivel)) &&
      ["Obligatorio", "Deseable"].includes(String(item.tipo)) &&
      nullableString(item.descripcion) &&
      typeof item.fechaCreacion === "string" &&
      Number.isFinite(Date.parse(item.fechaCreacion));
    if (valid) requirementIds.add(item.id as string);
    return valid;
  });
}

export async function listJobPostings(): Promise<JobPosting[]> {
  const postings = await apiFetch<ApiJobPosting[]>("/api/v1/job-postings");
  return postings.map(adaptJobPosting);
}

export async function getJobPosting(
  id: string,
  signal?: AbortSignal,
): Promise<JobPostingDetail> {
  const response = await apiFetch<unknown>(`/api/v1/job-postings/${encodeURIComponent(id)}`, {
    signal,
  });
  if (!isDetailResponse(response, id) || response.id.toLowerCase() !== id.toLowerCase()) {
    throw new ApiError(502, "El servidor devolvió un detalle de vacante no válido.");
  }
  const posting = response;
  return {
    ...adaptJobPosting(posting),
    affinityPercentage: posting.porcentajeAfinidad ?? null,
    affinityMessage: posting.mensajeAfinidad ?? null,
  };
}

export async function createJobPosting(
  input: CreateJobPostingInput,
): Promise<unknown> {
  return apiFetch("/api/v1/job-postings", {
    method: "POST",
    body: JSON.stringify({ ...input, empresaId: await getCurrentCompanyId() }),
  });
}
