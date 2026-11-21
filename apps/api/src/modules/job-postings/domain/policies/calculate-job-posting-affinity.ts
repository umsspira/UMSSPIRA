import type { JobPostingAffinityResult } from '@umsspira/shared-types';
import { normalizeTechnicalRequirementName } from './normalize-technical-requirement-name';
import {
  compareRequirementsWithProfile,
  type KeywordExtractor,
  type ProfileIndex,
} from './requirement-similarity';

/**
 * HU-10 con la similitud de HU-11: los requisitos pasan por el mismo NLP que el perfil
 * (diccionario, alias y raíces). Coincidencia exacta suma 100 % y parcial 50 % (MATCH_WEIGHTS).
 * El porcentaje se entrega entero, como exige el contrato compartido.
 */
export function calculateJobPostingAffinity(
  requirements: readonly string[],
  profile: ProfileIndex,
  extractor: KeywordExtractor,
  calculatedAt: string,
): JobPostingAffinityResult {
  const uniqueRequirements = new Map<string, string>();
  for (const requirement of requirements) {
    const normalized = normalizeTechnicalRequirementName(requirement);
    if (normalized && !uniqueRequirements.has(normalized)) {
      uniqueRequirements.set(normalized, requirement.trim());
    }
  }
  if (!uniqueRequirements.size) {
    return {
      status: 'no-requirements',
      percentage: null,
      calculatedAt: null,
      comparison: [],
    };
  }
  const similarity = compareRequirementsWithProfile([...uniqueRequirements.values()], profile, extractor);
  return {
    status: 'ready',
    percentage: Math.round(similarity.percentage),
    calculatedAt,
    comparison: similarity.comparison.map(({ requirement, matchedSkill, result }) => ({
      requirement,
      matchedSkill,
      result,
    })),
  };
}
