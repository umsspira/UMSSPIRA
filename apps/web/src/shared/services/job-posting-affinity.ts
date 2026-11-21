import type { TechnicalRequirement } from '@umsspira/shared-types';
import { getMentorOnboarding, getMyTechnicalInterests, MentorOnboardingError } from '@/features/mentorship/services/mentor-onboarding-api';

export type VacancyAffinityResult =
  | { status: 'profile-incomplete' }
  | { status: 'insufficient-requirements' }
  | {
      status: 'ready';
      percentage: number;
      calculatedAt: string;
      comparison: Array<{
        requirement: string;
        matchedSkill: string | null;
        result: 'exact' | 'similar' | 'not-found';
      }>;
    };

export type TituladoSkillsResult =
  | { status: 'ready'; skills: string[] }
  | { status: 'profile-incomplete' };

function normalizeWords(value: string): string[] {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').match(/[a-z0-9]+/g) ?? [];
}

export async function calculateVacancyAffinity(
  requirements: TechnicalRequirement[],
): Promise<VacancyAffinityResult> {
  if (requirements.length === 0) return { status: 'insufficient-requirements' };

  const profile = await loadTituladoSkills();
  return profile.status === 'ready'
    ? calculateVacancyAffinityWithSkills(requirements, profile.skills)
    : { status: 'profile-incomplete' };
}

/** Carga el perfil una vez para calcular la afinidad de todas las vacantes del listado. */
export async function loadTituladoSkills(): Promise<TituladoSkillsResult> {
  try {
    const [onboarding, customInterests] = await Promise.all([
      getMentorOnboarding(),
      getMyTechnicalInterests(),
    ]);
    const skills = Array.from(new Set([
      ...onboarding.areas.intereses.map((interest) => interest.nombre),
      ...onboarding.interests.catalog.flatMap((group) => group.intereses.filter((interest) => interest.seleccionado).map((interest) => interest.nombre)),
      ...customInterests,
    ].map((skill) => skill.trim()).filter(Boolean)));
    return { status: 'ready', skills };
  } catch (error) {
    if (error instanceof MentorOnboardingError && (error.status === 403 || error.status === 404)) {
      return { status: 'profile-incomplete' };
    }
    throw error;
  }
}

export function calculateVacancyAffinityWithSkills(
  requirements: TechnicalRequirement[],
  skills: string[],
): VacancyAffinityResult {
  if (requirements.length === 0) return { status: 'insufficient-requirements' };
  const uniqueRequirements = Array.from(new Map(requirements.map((requirement) => [normalizeWords(requirement.nombre).join(' '), requirement])).values());
  const comparison = uniqueRequirements.map(({ nombre }) => {
    const requiredWords = normalizeWords(nombre);
    const matchedSkill = skills.find((skill) => {
      const skillWords = normalizeWords(skill);
      return requiredWords.length > 0 && requiredWords.every((word) =>
        skillWords.some((skillWord) => skillWord === word || (word === 'java' && skillWord === 'javascript')),
      );
    }) ?? null;

    return {
      requirement: nombre,
      matchedSkill,
      result: matchedSkill
        ? normalizeWords(matchedSkill).join(' ') === requiredWords.join(' ')
          ? 'exact' as const
          : 'similar' as const
        : 'not-found' as const,
    };
  });
  const matchedCount = comparison.filter((item) => item.matchedSkill !== null).length;

  return {
    status: 'ready',
    percentage: Math.min(100, Math.round((matchedCount / uniqueRequirements.length) * 100)),
    calculatedAt: new Date().toISOString(),
    comparison,
  };
}
