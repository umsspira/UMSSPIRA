import type { JobPostingAffinityResult } from '@umsspira/shared-types';
import { calculateJobPostingAffinity } from '../../domain/policies/calculate-job-posting-affinity';
import { isAffinityProfileComplete } from '../../domain/policies/is-affinity-profile-complete';
import { normalizeTechnicalRequirementName } from '../../domain/policies/normalize-technical-requirement-name';
import type {
  JobPostingAffinityProfile,
  JobPostingAffinityRequirements,
} from '../ports/job-posting-affinity-data.port';
import type { JobPostingAffinityExtractorPort } from '../ports/job-posting-affinity-extractor.port';

export interface CalculateJobPostingAffinityInput {
  profile: JobPostingAffinityProfile | null;
  vacancies: readonly JobPostingAffinityRequirements[];
}

export interface CalculatedJobPostingAffinity {
  vacancyId: string;
  result: JobPostingAffinityResult;
}

/** Operación interna: el llamador carga datos autorizados y agrupa vacantes por perfil. */
export class CalculateJobPostingAffinity {
  constructor(
    private readonly extractor: JobPostingAffinityExtractorPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: CalculateJobPostingAffinityInput): Promise<CalculatedJobPostingAffinity[]> {
    const hasRequirements = (vacancy: JobPostingAffinityRequirements) =>
      vacancy.requirements.some((name) => normalizeTechnicalRequirementName(name).length > 0);
    const needsCalculation = input.vacancies.some(hasRequirements);
    const complete = input.profile !== null && isAffinityProfileComplete(input.profile);
    // Una extracción para todas las vacantes del perfil, sin caché global obsoleta.
    const skills =
      needsCalculation && complete && input.profile
        ? await this.extractor.extractSkills(input.profile.texts)
        : [];
    const calculatedAt = needsCalculation && complete ? this.now().toISOString() : '';
    return input.vacancies.map((vacancy) => ({
      vacancyId: vacancy.vacancyId,
      result: !hasRequirements(vacancy)
        ? { status: 'no-requirements', percentage: null, calculatedAt: null, comparison: [] }
        : !complete
          ? { status: 'profile-incomplete', percentage: null, calculatedAt: null, comparison: [] }
          : calculateJobPostingAffinity(vacancy.requirements, skills, calculatedAt),
    }));
  }
}
