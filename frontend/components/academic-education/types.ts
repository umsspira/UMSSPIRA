export const TIPOS_FORMACION = ["Bachiller", "Carrera"] as const;
export type TipoFormacion = (typeof TIPOS_FORMACION)[number];

export const NIVELES_ACADEMICOS = [
  "Técnico",
  "Licenciatura",
  "Diplomado",
  "Especialidad",
  "Maestría",
  "Doctorado",
] as const;

export const ESTADOS_FORMACION = ["Cursando", "Concluido", "Titulado"] as const;
export const ESTADO_CURSANDO = "Cursando";
export const TITULO_BACHILLER = "Bachiller";

export type AcademicEducationPayload = {
  idEgresado: string;
  idCarrera: string | null;
  tipoFormacion: TipoFormacion;
  institucion: string;
  titulo: string;
  nivelAcademico: string;
  estado: string;
  anioInicio: number;
  anioFin: number | null;
  descripcion?: string;
};

export type AcademicEducation = AcademicEducationPayload & {
  idFormacion: string;
};

export type Carrera = {
  idCarrera: string;
  nombre: string;
};

export type AcademicEducationFormValues = {
  tipoFormacion: TipoFormacion | "";
  institucion: string;
  idCarrera: string;
  nivelAcademico: string;
  estado: string;
  anioInicio: string;
  anioFin: string;
  actualmenteCursando: boolean;
  descripcion: string;
};

export type AcademicEducationFormErrors = Partial<
  Record<keyof AcademicEducationFormValues, string>
>;

export type AcademicEducationFormMode = "create" | "edit";
