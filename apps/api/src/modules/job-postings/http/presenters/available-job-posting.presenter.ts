import type { AvailableJobPosting } from '../../domain/entities/available-job-posting.entity';

export function presentAvailableJobPosting(posting: AvailableJobPosting) {
  return {
    id: posting.id,
    titulo: posting.title,
    empresa: posting.companyName,
    logoEmpresa: posting.companyLogoUrl,
    descripcion: posting.technicalDescription,
    area: posting.area,
    modalidad: posting.modality,
    nivelExperiencia: posting.experienceLevel,
    ubicacion: posting.location,
    fechaPublicacion: posting.publishedAt?.toISOString() ?? null,
    porcentajeAfinidad: posting.affinityPercentage,
  };
}
