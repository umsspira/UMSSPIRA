import type { TechnicalRequirementsForVacancy } from '../../domain/entities/technical-requirement.entity';

export function presentTechnicalRequirements(result: TechnicalRequirementsForVacancy) {
  return {
    vacanteId: result.vacancyId,
    vacanteTitulo: result.vacancyTitle,
    requisitos: result.requirements.map((requirement) => ({
      id: requirement.id,
      competenciaTecnica: requirement.competency,
      nivelEsperado: requirement.expectedLevel,
      tipo: requirement.type,
      descripcion: requirement.description ?? '',
      fechaCreacion: requirement.createdAt.toISOString(),
    })),
  };
}
