import type { JobPostingAffinityResult } from '@umsspira/shared-types';
import { calculateJobPostingAffinity } from '../../domain/policies/calculate-job-posting-affinity';
import { isAffinityProfileComplete } from '../../domain/policies/is-affinity-profile-complete';
import { normalizeTechnicalRequirementName } from '../../domain/policies/normalize-technical-requirement-name';
import {
  buildProfileIndex,
  type KeywordExtractor,
  type ProfileIndex,
} from '../../domain/policies/requirement-similarity';
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
    // Una extracción del perfil para todas sus vacantes, sin caché global obsoleta.
    // Cada campo se procesa por separado: ningún n-grama cruza campos del perfil (HU-11).
    let engine: { extractor: KeywordExtractor; profile: ProfileIndex } | null = null;
    if (needsCalculation && complete && input.profile) {
      const extractor = await this.extractor.loadExtractor();
      engine = { extractor, profile: buildProfileIndex(input.profile.texts, extractor) };
    }
    const calculatedAt = engine ? this.now().toISOString() : '';
    return input.vacancies.map((vacancy) => ({
      vacancyId: vacancy.vacancyId,
      result: !hasRequirements(vacancy)
        ? { status: 'no-requirements', percentage: null, calculatedAt: null, comparison: [] }
        : engine === null
          ? { status: 'profile-incomplete', percentage: null, calculatedAt: null, comparison: [] }
          : calculateJobPostingAffinity(vacancy.requirements, engine.profile, engine.extractor, calculatedAt),
    }));
  }
}
