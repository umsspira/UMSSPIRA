import { createHash } from 'node:crypto';
import { normalizeTechnicalRequirementName } from './normalize-technical-requirement-name';
import type {
  JobPostingAffinityProfile,
  JobPostingAffinityRequirements,
} from '../../application/ports/job-posting-affinity-data.port';

// Incrementar cuando cambie el algoritmo realmente conectado a HU-10 o su diccionario.
// HU-11 aún no está conectado al caso de uso activo.
export const JOB_AFFINITY_INPUT_VERSION = 'hu10-exact-v1';

export function jobPostingAffinityInputHash(
  profile: JobPostingAffinityProfile | null,
  vacancy: JobPostingAffinityRequirements,
  version = JOB_AFFINITY_INPUT_VERSION,
): string {
  const texts = (profile?.texts ?? [])
    .map((text) => text.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter(Boolean)
    .sort();
  const requirements = [...new Set(vacancy.requirements
    .map(normalizeTechnicalRequirementName)
    .filter(Boolean))].sort();
  const input = {
    version,
    profile: {
      description: Boolean(profile?.description?.trim()),
      education: profile?.hasEducation ?? false,
      experience: profile?.hasExperience ?? false,
      certification: profile?.hasCertification ?? false,
      project: profile?.hasProject ?? false,
      texts,
    },
    requirements,
  };
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}
