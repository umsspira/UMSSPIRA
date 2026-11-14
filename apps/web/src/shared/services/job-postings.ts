import { apiFetch } from "./api-client";
import { getCurrentCompanyId } from "./companies";
import type { JobPosting as CreatedJobPosting } from "@umsspira/shared-types";

export interface JobPostingRequirement {
  areaId?: string | null;
  name: string;
  level: string | null;
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
  affinityPercentage: number | null;
}

export type JobPostingDetail = JobPosting;

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
  requisitosTecnicos: Array<{
    areaId: string | null;
    nombre: string;
    nivel: string | null;
  }>;
  porcentajeAfinidad: number | null;
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
      areaId: requirement.areaId,
      name: requirement.nombre,
      level: requirement.nivel,
    })),
    affinityPercentage: posting.porcentajeAfinidad,
  };
}

export interface JobPostingsListOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export async function listJobPostings(
  options: JobPostingsListOptions = {},
): Promise<JobPosting[]> {
  const search = options.search?.trim();
  const query = new URLSearchParams();
  if (search) {
    query.set("search", search);
    query.set("page", String(options.page ?? 1));
    query.set("limit", String(options.limit ?? 10));
  }
  const suffix = search ? `?${query.toString()}` : "";
  const postings = await apiFetch<ApiJobPosting[]>(`/api/v1/job-postings${suffix}`);
  return postings.map(adaptJobPosting);
}

export async function getJobPosting(
  id: string,
  signal?: AbortSignal,
): Promise<JobPostingDetail> {
  const posting = await apiFetch<ApiJobPosting>(`/api/v1/job-postings/${encodeURIComponent(id)}`, {
    signal,
  });
  return adaptJobPosting(posting);
}

export async function createJobPosting(
  input: CreateJobPostingInput,
): Promise<CreatedJobPosting> {
  return apiFetch<CreatedJobPosting>("/api/v1/job-postings", {
    method: "POST",
    body: JSON.stringify({ ...input, empresaId: await getCurrentCompanyId() }),
  });
}
