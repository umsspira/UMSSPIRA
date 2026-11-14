/** HU8's existing frontend view, independent of either HU2 persistence model. */
export interface PublishedTechnicalRequirement {
  id: string;
  idVacante: string;
  competencia: string;
  // Experto remains part of the existing view; the canonical reader emits only
  // the three levels supported by the recent HU2/HU3 contract.
  nivel: 'Básico' | 'Intermedio' | 'Avanzado' | 'Experto';
  tipo: 'Obligatorio' | 'Deseable';
  descripcion?: string;
  fechaCreacion: string;
}

export interface PublishedTechnicalRequirementsReader {
  obtenerRequisitos(vacancyId: string): Promise<PublishedTechnicalRequirement[]>;
}
