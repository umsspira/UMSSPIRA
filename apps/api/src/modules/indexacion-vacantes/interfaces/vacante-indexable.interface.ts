/**
 * Contrato provisional entre HU3 y HU4.
 * HU3 podrá adaptar su salida a esta estructura cuando esté implementada.
 */
export interface RequerimientoIndexable {
  id?: string;
  nombre: string;
  tipo?: string;
  nivel?: string;
}

export interface VacanteIndexable {
  id: string;
  titulo: string;
  descripcion: string;
  empresa: string;
  ubicacion?: string;
  modalidad?: string;
  tipoContrato?: string;
  fechaPublicacion?: string;
  estado?: string;
  requerimientosLaborales?: RequerimientoIndexable[];
}
