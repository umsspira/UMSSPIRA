import { apiFetch } from "./api-client";
import { getCurrentCompanyId } from "./companies";
import type { JobPosting } from "@umsspira/shared-types";

export interface CreateJobPostingInput {
  titulo: string;
  modalidad: string;
  nivelExperiencia: string;
  descripcionTecnica: string;
}

export async function createJobPosting(
  input: CreateJobPostingInput,
): Promise<JobPosting> {
  return apiFetch<JobPosting>("/api/v1/job-postings", {
    method: "POST",
    body: JSON.stringify({ ...input, empresaId: await getCurrentCompanyId() }),
  });
}
