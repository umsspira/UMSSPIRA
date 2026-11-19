import { obtenerResumenPerfil } from '@/modules/profile/services/perfil-api';
import type { ResumenPerfil } from '@/modules/profile/services/perfil-api';
import type { TechnicalRequirement } from '@umsspira/shared-types';
import { apiFetch } from './api-client';
import { normalizeJobPostingTerm } from '@/shared/utils/job-posting-requirements';

const NLP_EXTRACT_ENDPOINT = '/api/v1/nlp/extract';
const NLP_MAX_TEXT_LENGTH = 5000;

interface ExtractedKeyword {
  term: string;
  count: number;
}

interface ExtractedKeywordsResponse {
  keywords: ExtractedKeyword[];
}

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

function profileTexts(profile: ResumenPerfil): string[] {
  const { education, experience, certification, project } = profile.records;
  return [
    profile.description,
    ...education.flatMap((record) => 'title' in record ? [record.title, record.degree] : []),
    ...experience.flatMap((record) => 'position' in record ? [record.position] : []),
    ...certification.flatMap((record) => 'issuer' in record ? [record.name, record.degree] : []),
    ...project.flatMap((record) => 'technologies' in record ? [record.name, record.description, record.technologies ?? ''] : []),
  ].concat(profile.header.career).map((text) => text.trim()).filter(Boolean);
}

function textChunks(texts: string[]): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const text of texts) {
    for (let offset = 0; offset < text.length; offset += NLP_MAX_TEXT_LENGTH) {
      const part = text.slice(offset, offset + NLP_MAX_TEXT_LENGTH);
      const next = current ? `${current}\n${part}` : part;
      if (next.length > NLP_MAX_TEXT_LENGTH) {
        chunks.push(current);
        current = part;
      } else {
        current = next;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function projectTechnologySkills(profile: ResumenPerfil): string[] {
  return profile.records.project.flatMap((project) =>
    ('technologies' in project ? project.technologies ?? '' : '')
      .split(/[,;\n|]+/).map((technology) => technology.trim()).filter(Boolean),
  );
}

export async function calculateVacancyAffinity(
  requirements: TechnicalRequirement[],
): Promise<VacancyAffinityResult> {
  if (requirements.length === 0) return { status: 'insufficient-requirements' };

  const profile = await obtenerResumenPerfil();
  const texts = profileTexts(profile);
  const explicitSkills = projectTechnologySkills(profile);
  const extracted = await Promise.all(
    textChunks(texts).map((text) =>
      apiFetch<ExtractedKeywordsResponse>(NLP_EXTRACT_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    ),
  );
  const skills = Array.from(new Set([
    ...extracted.flatMap((result) => result.keywords.map((keyword) => keyword.term)),
    ...explicitSkills,
  ])).filter((skill) => normalizeJobPostingTerm(skill).length > 0);

  return calculateVacancyAffinityWithSkills(requirements, skills);
}

/** Carga el perfil una vez para calcular la afinidad de todas las vacantes del listado. */
export async function loadTituladoSkills(): Promise<TituladoSkillsResult> {
  const profile = await obtenerResumenPerfil();
  const texts = profileTexts(profile);
  const explicitSkills = projectTechnologySkills(profile);
  const extracted = await Promise.all(
    textChunks(texts).map((text) =>
      apiFetch<ExtractedKeywordsResponse>(NLP_EXTRACT_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    ),
  );
  const skills = Array.from(new Set([
    ...extracted.flatMap((result) => result.keywords.map((keyword) => keyword.term)),
    ...explicitSkills,
  ])).filter((skill) => normalizeJobPostingTerm(skill).length > 0);

  return skills.length > 0 ? { status: 'ready', skills } : { status: 'profile-incomplete' };
}

export function calculateVacancyAffinityWithSkills(
  requirements: TechnicalRequirement[],
  skills: string[],
): VacancyAffinityResult {
  if (requirements.length === 0) return { status: 'insufficient-requirements' };
  if (skills.length === 0) return { status: 'profile-incomplete' };

  const comparison = requirements.map(({ nombre }) => {
    const normalizedRequirement = normalizeJobPostingTerm(nombre);
    const matchedSkill = skills.find((skill) => {
      const normalizedSkill = normalizeJobPostingTerm(skill);
      return normalizedSkill.length >= 3 && normalizedRequirement.includes(normalizedSkill);
    }) ?? null;

    return {
      requirement: nombre,
      matchedSkill,
      result: matchedSkill
        ? normalizeJobPostingTerm(matchedSkill) === normalizedRequirement
          ? 'exact' as const
          : 'similar' as const
        : 'not-found' as const,
    };
  });
  const matchedCount = comparison.filter((item) => item.matchedSkill !== null).length;

  return {
    status: 'ready',
    percentage: Math.round((matchedCount / requirements.length) * 100),
    calculatedAt: new Date().toISOString(),
    comparison,
  };
}
