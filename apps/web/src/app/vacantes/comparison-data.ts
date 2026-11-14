import type { Skill } from '../skills/data';
import type { Vacancy } from './vacancy-data';

export const SKILLS_STORAGE_KEY = 'umsspira-skills';

export type ComparedRequirement = {
  index: number;
  requirement: string;
  skillName: string;
  requiredLevel?: string;
  profileSkill?: Skill;
  meetsRequirement: boolean;
};

const levelOrder = ['Básico', 'Intermedio', 'Avanzado', 'Experto'];

function canonicalName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitRequirement(requirement: string) {
  const levelMatch = requirement.match(
    /\s+(básico|intermedio|avanzado|experto)$/i,
  );
  const requiredLevel = levelMatch
    ? levelOrder.find(
        (level) => canonicalName(level) === canonicalName(levelMatch[1]),
      )
    : undefined;
  const skillName = levelMatch
    ? requirement.slice(0, levelMatch.index).trim()
    : requirement.trim();

  return { skillName, requiredLevel };
}

function isSkill(value: unknown): value is Skill {
  if (typeof value !== 'object' || value === null) return false;

  const skill = value as Record<string, unknown>;
  return (
    typeof skill.id === 'string' &&
    typeof skill.name === 'string' &&
    typeof skill.category === 'string' &&
    typeof skill.level === 'string' &&
    (typeof skill.years === 'number' || skill.years === null)
  );
}

export function parseProfileSkills(saved: string | null): Skill[] {
  if (!saved) return [];

  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isSkill)) {
    throw new Error('Las habilidades del perfil tienen un formato no válido.');
  }

  return parsed;
}

export function readProfileSkills(): Skill[] {
  return parseProfileSkills(localStorage.getItem(SKILLS_STORAGE_KEY));
}

export function compareRequirements(
  vacancy: Vacancy,
  skills: Skill[],
): ComparedRequirement[] {
  return vacancy.requirements.map((requirement, index) => {
    const { skillName, requiredLevel } = splitRequirement(requirement);
    const matchingSkills = skills.filter(
      (skill) =>
        canonicalName(splitRequirement(skill.name).skillName) ===
        canonicalName(skillName),
    );
    const requiredLevelIndex = requiredLevel
      ? levelOrder.indexOf(requiredLevel)
      : -1;
    const qualifyingSkill =
      requiredLevelIndex >= 0
        ? matchingSkills.find(
            (skill) => levelOrder.indexOf(skill.level) >= requiredLevelIndex,
          )
        : undefined;
    const profileSkill = qualifyingSkill ?? matchingSkills[0];
    const profileLevelIndex = profileSkill
      ? levelOrder.indexOf(profileSkill.level)
      : -1;
    const meetsRequirement =
      profileSkill !== undefined &&
      (requiredLevelIndex < 0 ||
        profileLevelIndex >= requiredLevelIndex);

    return {
      index,
      requirement,
      skillName,
      requiredLevel,
      profileSkill,
      meetsRequirement,
    };
  });
}
