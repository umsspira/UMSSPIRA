import { apiFetch } from "./api-client";
import { getCurrentCompanyId } from "./companies";

export interface JobPostingRequirement {
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
}

export interface JobPostingDetail extends JobPosting {
  affinityPercentage: number | null;
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
  requisitosTecnicos: Array<{
    areaId: string | null;
    nombre: string;
    nivel: string | null;
  }>;
  porcentajeAfinidad?: number | null;
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
  };
}

export async function listJobPostings(): Promise<JobPosting[]> {
  const postings = await apiFetch<ApiJobPosting[]>("/api/v1/job-postings");
  return postings.map(adaptJobPosting);
}

export async function getJobPosting(
  id: string,
  signal?: AbortSignal,
): Promise<JobPostingDetail> {
  const posting = await apiFetch<ApiJobPosting>(`/api/v1/job-postings/${encodeURIComponent(id)}`, {
    signal,
  });
  return {
    ...adaptJobPosting(posting),
    affinityPercentage: posting.porcentajeAfinidad ?? null,
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
