export interface AvailableJobPosting {
  id: string;
  titulo: string;
  empresa: string | null;
  descripcionTecnica: string | null;
  modalidad: string | null;
  fechaPublicacion: string | null;
}

export interface TechnicalRequirement {
  id: string;
  nombre: string;
}

export interface AvailableJobPostingDetail extends AvailableJobPosting {
  nivelExperiencia: string | null;
  requisitos: TechnicalRequirement[];
}
