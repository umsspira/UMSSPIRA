import type {
  PublishedJobPosting,
  PublishedJobPostingDetail,
} from '../../domain/entities/published-job-posting.entity';

export function presentPublishedJobPosting(posting: PublishedJobPosting) {
  return {
    id: posting.id,
    titulo: posting.title,
    modalidad: posting.modality,
    nivelExperiencia: posting.experienceLevel,
    descripcionTecnica: posting.technicalDescription,
    fechaPublicacion: posting.publishedAt?.toISOString() ?? null,
    empresa: posting.company
      ? {
          razonSocial: posting.company.name,
          descripcion: posting.company.description,
          logoUrl: posting.company.logoUrl,
          bannerUrl: posting.company.bannerUrl,
        }
      : null,
    requisitosTecnicos: posting.technicalRequirements.map((requirement) => ({
      areaId: requirement.areaId,
      nombre: requirement.name,
      nivel: requirement.level,
    })),
  };
}

export function presentPublishedJobPostingDetail(
  posting: PublishedJobPostingDetail,
) {
  return {
    ...presentPublishedJobPosting(posting),
    porcentajeAfinidad: posting.affinityPercentage,
  };
}
