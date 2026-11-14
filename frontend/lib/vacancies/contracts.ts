export type NivelEsperado = 'Básico' | 'Intermedio' | 'Avanzado' | 'Experto';
export type TipoRequisito = 'Obligatorio' | 'Deseable';

export const NIVELES_ESPERADOS: NivelEsperado[] = [
  'Básico',
  'Intermedio',
  'Avanzado',
  'Experto',
];

export const TIPOS_REQUISITO: TipoRequisito[] = ['Obligatorio', 'Deseable'];

export interface VacancyTechnicalRequirementsReference {
  requerimientoLaboralIds: string[];
}

export interface CanonicalVacancy {
  id: string;
  titulo: string;
  idEmpresa: string;
  estado: string;
  requisitosTecnicos: VacancyTechnicalRequirementsReference;
}

export type ValidateVacancyStructureRequest = CanonicalVacancy;

export interface ValidateVacancyStructureResponse {
  valida: true;
  vacante: CanonicalVacancy;
}

export interface RequisitoTecnico {
  id: string;
  idVacante: string;
  competencia: string;
  nivel: NivelEsperado;
  tipo: TipoRequisito;
  descripcion?: string;
  fechaCreacion?: string;
}

export interface RequisitoIndexadoMatching {
  idRequisito: string;
  competenciaOriginal: string;
  nivelEsperado: NivelEsperado;
  pesoNivel: number;
  tipo: TipoRequisito;
  esObligatorio: boolean;
  descripcion?: string;
}

export interface EstructuraIndexacionVacante {
  idVacante: string;
  totalRequisitos: number;
  obligatorios: RequisitoTecnico[];
  deseables: RequisitoTecnico[];
  competenciasIndex: Record<string, RequisitoIndexadoMatching>;
  metadatosMatching: {
    totalObligatorios: number;
    totalDeseables: number;
    requiereMatchingExacto: boolean;
    versionMotor: string;
  };
}
