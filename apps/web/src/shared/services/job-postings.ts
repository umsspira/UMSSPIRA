import { apiFetch } from "./api-client";
import { getCurrentCompanyId } from "./companies";

export interface CreateJobPostingInput {
  titulo: string;
  modalidad: string;
  nivelExperiencia: string;
  descripcionTecnica: string;
}

export interface AvailableJobPosting {
  id: string;
  titulo: string;
  empresa: string;
  logoEmpresa: string | null;
  descripcion: string;
  area: string | null;
  modalidad: string;
  nivelExperiencia: string;
  ubicacion: string | null;
  fechaPublicacion: string | null;
  porcentajeAfinidad: number | null;
}

export async function createJobPosting(
  input: CreateJobPostingInput,
): Promise<unknown> {
  return apiFetch("/api/v1/job-postings", {
    method: "POST",
    body: JSON.stringify({ ...input, empresaId: await getCurrentCompanyId() }),
  });
}

export async function getAvailableJobPostings(): Promise<AvailableJobPosting[]> {
  const postings = await apiFetch<AvailableJobPosting[]>("/api/v1/job-postings");
  return Array.isArray(postings) ? postings : [];
}
