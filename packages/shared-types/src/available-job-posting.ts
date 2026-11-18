export interface AvailableJobPosting {
  id: string;
  titulo: string;
  empresa: string | null;
  fechaPublicacion: string | null;
}

export interface TechnicalRequirement {
  id: string;
  nombre: string;
}

export interface AvailableJobPostingDetail extends AvailableJobPosting {
  descripcionTecnica: string | null;
  modalidad: string | null;
  nivelExperiencia: string | null;
  requisitos: TechnicalRequirement[];
}
