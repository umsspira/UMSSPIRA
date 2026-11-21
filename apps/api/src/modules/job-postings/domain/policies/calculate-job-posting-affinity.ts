import type { JobPostingAffinityResult } from '@umsspira/shared-types';
import { normalizeTechnicalRequirementName } from './normalize-technical-requirement-name';

export function calculateJobPostingAffinity(
  requirements: readonly string[],
  skills: readonly string[],
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
  const normalizedSkills = new Map(
    skills.map((skill) => [normalizeTechnicalRequirementName(skill), skill.trim()]),
  );
  const comparison = [...uniqueRequirements].map(([normalized, requirement]) => {
    const matchedSkill = normalizedSkills.get(normalized) ?? null;
    return {
      requirement,
      matchedSkill,
      result: matchedSkill === null ? ('not-found' as const) : ('exact' as const),
    };
  });
  const fulfilled = comparison.filter((item) => item.result === 'exact').length;
  return {
    status: 'ready',
    percentage: Math.round((fulfilled / comparison.length) * 100),
    calculatedAt,
    comparison,
  };
}
