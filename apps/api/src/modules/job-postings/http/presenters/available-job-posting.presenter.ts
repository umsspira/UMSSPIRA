import type {
  JobPostingDetailCandidate,
  JobPostingListCandidate,
} from '../../application/contracts/available-job-posting';
import { normalizeTechnicalRequirementName } from '../../domain/policies/normalize-technical-requirement-name';

export function presentAvailableJobPosting(posting: JobPostingListCandidate) {
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
    id: posting.id,
    titulo: posting.title,
    empresa: posting.companyName,
    areaLaboral: posting.areaName,
    ubicacion: posting.locationName,
    descripcionTecnica: posting.technicalDescription,
    modalidad: posting.modality,
    fechaPublicacion: posting.publicationDate?.toISOString() ?? null,
    requisitos: requisitos.map((requirement) => ({
      id: requirement.id,
      nombre: requirement.name,
    })),
  };
}

export function presentAvailableJobPostingDetail(posting: JobPostingDetailCandidate) {
  return {
    ...presentAvailableJobPosting(posting),
    nivelExperiencia: posting.experienceLevel,
  };
}
