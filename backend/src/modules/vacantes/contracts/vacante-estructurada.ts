export interface ReferenciaRequisitosTecnicos {
  requerimientoLaboralIds: string[];
}

export interface VacanteEstructurada {
  id: string;
  titulo: string;
  idEmpresa: string;
  estado: string;
  requisitosTecnicos: ReferenciaRequisitosTecnicos;
}

export interface ResultadoValidacionVacante {
  valida: true;
  vacante: VacanteEstructurada;
}
