import type {
  TechnicalRequirementInput,
  TechnicalRequirementsForVacancy,
} from '@umsspira/shared-types';
import { apiFetch } from '@/shared/services/api-client';

export function getTechnicalRequirements(vacancyId: string) {
  return apiFetch<TechnicalRequirementsForVacancy>(
    `/api/v1/job-postings/${vacancyId}/technical-requirements`,
  );
}

export function saveTechnicalRequirements(
  vacancyId: string,
  requirements: TechnicalRequirementInput[],
) {
  return apiFetch<TechnicalRequirementsForVacancy>(
    `/api/v1/job-postings/${vacancyId}/technical-requirements`,
    {
      method: 'PUT',
      body: JSON.stringify({ requisitos: requirements }),
    },
  );
}
