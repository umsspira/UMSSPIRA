import { apiFetch } from './api-client';

export interface ApplicationStatus {
  postulada: boolean;
}

export async function getMyJobApplication(vacancyId: string): Promise<ApplicationStatus> {
  return apiFetch<ApplicationStatus>(`/api/v1/vacantes/${encodeURIComponent(vacancyId)}/postulaciones/mia`);
}

export async function applyToJob(vacancyId: string): Promise<ApplicationStatus & { yaExistia: boolean }> {
  return apiFetch<ApplicationStatus & { yaExistia: boolean }>(
    `/api/v1/vacantes/${encodeURIComponent(vacancyId)}/postulaciones`,
    { method: 'POST' },
  );
}
