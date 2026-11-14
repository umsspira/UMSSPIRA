import type {
  GraduateSkills,
  RequiredJobSkill,
} from '../entities/graduate-skills.entity';

function normalizeWords(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+(?:[+#][\p{L}\p{N}]+|[+#]+)*/gu) ?? [];
}

function containsSkill(evidence: string[], requiredWords: string[]): boolean {
  if (requiredWords.length === 0) {
    return false;
  }

  return evidence.some((text) => {
    const words = normalizeWords(text);
    return words.some((_, start) =>
      requiredWords.every((word, offset) => words[start + offset] === word),
    );
  });
}

/**
 * Scores the share of distinct required skills evidenced by the graduate profile.
 * A skill is evidenced by its exact area assignment or by an exact phrase in
 * the graduate's professional description, experience, or certifications.
 */
export function calculateJobPostingAffinity(
  graduate: GraduateSkills | null,
  requirements: RequiredJobSkill[],
): number | null {
  if (!graduate || requirements.length === 0) {
    return null;
  }

  const distinctRequirements = Array.from(
    new Map(
      requirements
        .filter((requirement) => requirement.name.trim().length > 0)
        .map((requirement) => [
          requirement.areaId ?? requirement.name.trim().toLowerCase(),
          requirement,
        ]),
    ).values(),
  );
  if (distinctRequirements.length === 0) {
    return null;
  }

  const graduateAreaIds = new Set(graduate.areaIds);
  const matchedRequirements = distinctRequirements.filter((requirement) => {
    if (requirement.areaId && graduateAreaIds.has(requirement.areaId)) {
      return true;
    }

    return containsSkill(graduate.evidence, normalizeWords(requirement.name));
  }).length;

  return Number(((matchedRequirements / distinctRequirements.length) * 100).toFixed(2));
}
