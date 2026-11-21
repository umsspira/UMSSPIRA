export interface AvailableJobPosting {
  id: string;
  titulo: string;
  empresa: string | null;
  areaLaboral?: string | null;
  ubicacion?: string | null;
  descripcionTecnica: string | null;
  modalidad: string | null;
  fechaPublicacion: string | null;
  requisitos: TechnicalRequirement[];
}

export interface TechnicalRequirement {
  id: string;
  nombre: string;
}

export interface AvailableJobPostingDetail extends AvailableJobPosting {
  nivelExperiencia: string | null;
}
