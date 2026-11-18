import type {
  JobPostingDetailCandidate,
  JobPostingListCandidate,
} from '../../application/contracts/available-job-posting';
import { normalizeTechnicalRequirementName } from '../../domain/policies/normalize-technical-requirement-name';

export function presentAvailableJobPosting(posting: JobPostingListCandidate) {
  return {
    id: posting.id,
    titulo: posting.title,
    empresa: posting.companyName,
    descripcionTecnica: posting.technicalDescription,
    modalidad: posting.modality,
    fechaPublicacion: posting.publicationDate?.toISOString() ?? null,
  };
}

export function presentAvailableJobPostingDetail(posting: JobPostingDetailCandidate) {
  const seen = new Set<string>();
  const requisitos = posting.requirements.filter((requirement) => {
    const normalizedName = normalizeTechnicalRequirementName(requirement.name);
    if (!normalizedName || seen.has(normalizedName)) {
      return false;
    }
    seen.add(normalizedName);
    return true;
  });

  return {
    ...presentAvailableJobPosting(posting),
    nivelExperiencia: posting.experienceLevel,
    requisitos: requisitos.map((requirement) => ({
      id: requirement.id,
      nombre: requirement.name,
    })),
  };
}
