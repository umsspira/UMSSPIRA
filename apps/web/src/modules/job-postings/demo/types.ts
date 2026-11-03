/** Isolated examples from the old frontend; these are not official API DTOs. */
export type DemoDetailContent = {
  locationDetail?: string;
  about?: string[];
  experience?: string;
  experienceNote?: string;
  schedule?: string;
  closingDate?: string;
  responsibilities?: string[];
  desirable?: string;
  benefits?: string[];
  companyDescription?: string;
  companyFacts?: string;
};

export type DemoVacancy = {
  id: string;
  idEmpresa: string;
  titulo: string;
  empresa: string;
  area: string;
  modalidad: string;
  ubicacion: string;
  descripcion: string;
  estado: string;
  fechaCreacion: string;
  condiciones: string;
  requisitos: { id: string; nombre: string }[];
  detailContent: DemoDetailContent;
};
