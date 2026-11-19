import type { TechnicalRequirement } from '@umsspira/shared-types';

const REQUIREMENTS_SECTION_TITLE = 'conocimientos tecnicos requeridos';

export function normalizeJobPostingTerm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, '');
}

function cleanRequirement(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractTechnicalRequirements(description: string | null | undefined): string[] {
  if (!description) return [];

  const lines = description.replace(/\r\n?/g, '\n').split('\n');
  const sectionIndex = lines.findIndex((line) =>
    normalizeJobPostingTerm(cleanRequirement(line).replace(/:$/, '')) ===
    normalizeJobPostingTerm(REQUIREMENTS_SECTION_TITLE),
  );

  if (sectionIndex < 0) return [];

  const requirements: string[] = [];
  let foundBullet = false;
  for (const line of lines.slice(sectionIndex + 1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^(?:#{1,6}\s|\*\*[^*].*\*\*\s*:?\s*$)/.test(trimmed)) break;

    const bullet = trimmed.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (bullet?.[1]) {
      const requirement = cleanRequirement(bullet[1]);
      if (requirement) requirements.push(requirement);
      foundBullet = true;
      continue;
    }

    if (foundBullet) break;
  }

  return Array.from(
    new Map(requirements.map((requirement) => [normalizeJobPostingTerm(requirement), requirement]))
      .values(),
  );
}

export function descriptionWithoutRequirements(description: string | null | undefined): string {
  if (!description) return '';
  const lines = description.replace(/\r\n?/g, '\n').split('\n');
  const sectionIndex = lines.findIndex((line) =>
    normalizeJobPostingTerm(cleanRequirement(line).replace(/:$/, '')) ===
    normalizeJobPostingTerm(REQUIREMENTS_SECTION_TITLE),
  );
  if (sectionIndex < 0) return description.trim();

  let endIndex = lines.length;
  let foundBullet = false;
  for (let index = sectionIndex + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) continue;
    if (/^(?:#{1,6}\s|\*\*[^*].*\*\*\s*:?\s*$)/.test(trimmed)) {
      endIndex = index;
      break;
    }
    if (/^(?:[-*•]|\d+[.)])\s+/.test(trimmed)) {
      foundBullet = true;
      continue;
    }
    if (foundBullet) {
      endIndex = index;
      break;
    }
  }

  return [...lines.slice(0, sectionIndex), ...lines.slice(endIndex)].join('\n').trim();
}

export function mergeTechnicalRequirements(
  description: string | null | undefined,
  storedRequirements: TechnicalRequirement[],
): TechnicalRequirement[] {
  const merged: TechnicalRequirement[] = [];
  const seen = new Set<string>();

  for (const name of [
    ...extractTechnicalRequirements(description),
    ...storedRequirements.map((requirement) => requirement.nombre),
  ]) {
    const normalized = normalizeJobPostingTerm(name);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push({
      id: `requirement-${merged.length + 1}`,
      nombre: name,
    });
  }

  return merged;
}
