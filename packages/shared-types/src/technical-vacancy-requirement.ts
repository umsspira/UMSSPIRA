export interface TechnicalVacancyRequirement {
  id: string;
  idVacante: string;
  competencia: string;
  nivel: string;
  tipo: string;
  descripcion?: string | null;
  fechaCreacion?: string;
}
