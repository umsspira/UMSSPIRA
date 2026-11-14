import {
  ESTADO_CURSANDO,
  TITULO_BACHILLER,
  type AcademicEducation,
  type AcademicEducationFormErrors,
  type AcademicEducationFormValues,
  type AcademicEducationPayload,
  type Carrera,
} from "@/components/academic-education/types";

export const MESSAGES = {
  required: "Este campo es obligatorio.",
  yearFormat: "Ingresa un año válido de 4 dígitos (AAAA).",
  endBeforeStart: "El año de finalización no puede ser menor al año de inicio.",
  unsafeChars: "El campo contiene caracteres no permitidos.",
  institutionLength: "La institución no puede superar los 100 caracteres.",
  descriptionLength: "La descripción no puede superar los 250 caracteres.",
} as const;

const UNSAFE_CHARS = /[<>/;]/;
const YEAR_FORMAT = /^\d{4}$/;

export const EMPTY_FORM_VALUES: AcademicEducationFormValues = {
  tipoFormacion: "",
  institucion: "",
  idCarrera: "",
  nivelAcademico: "",
  estado: "",
  anioInicio: "",
  anioFin: "",
  actualmenteCursando: false,
  descripcion: "",
};

export function toFormValues(record: AcademicEducation): AcademicEducationFormValues {
  const actualmenteCursando = record.estado === ESTADO_CURSANDO && record.anioFin === null;

  return {
    tipoFormacion: record.tipoFormacion,
    institucion: record.institucion,
    idCarrera: record.idCarrera ?? "",
    nivelAcademico: record.nivelAcademico,
    estado: record.estado,
    anioInicio: String(record.anioInicio),
    anioFin: record.anioFin === null ? "" : String(record.anioFin),
    actualmenteCursando,
    descripcion: record.descripcion ?? "",
  };
}

export function validateAcademicEducation(
  values: AcademicEducationFormValues,
): AcademicEducationFormErrors {
  const errors: AcademicEducationFormErrors = {};

  if (!values.tipoFormacion) errors.tipoFormacion = MESSAGES.required;

  const institucion = values.institucion.trim();
  if (!institucion) errors.institucion = MESSAGES.required;
  else if (institucion.length > 100) errors.institucion = MESSAGES.institutionLength;
  else if (UNSAFE_CHARS.test(institucion)) errors.institucion = MESSAGES.unsafeChars;

  if (values.tipoFormacion === "Carrera" && !values.idCarrera) {
    errors.idCarrera = MESSAGES.required;
  }
  if (!values.nivelAcademico) errors.nivelAcademico = MESSAGES.required;
  if (!values.estado) errors.estado = MESSAGES.required;

  const anioInicio = values.anioInicio.trim();
  if (!anioInicio) errors.anioInicio = MESSAGES.required;
  else if (!YEAR_FORMAT.test(anioInicio)) errors.anioInicio = MESSAGES.yearFormat;

  const anioFin = values.anioFin.trim();
  if (!values.actualmenteCursando && anioFin) {
    if (!YEAR_FORMAT.test(anioFin)) {
      errors.anioFin = MESSAGES.yearFormat;
    } else if (!errors.anioInicio && Number(anioFin) < Number(anioInicio)) {
      errors.anioFin = MESSAGES.endBeforeStart;
    }
  }

  if (UNSAFE_CHARS.test(values.descripcion)) {
    errors.descripcion = MESSAGES.unsafeChars;
  } else if (values.descripcion.length > 250) {
    errors.descripcion = MESSAGES.descriptionLength;
  }

  return errors;
}

export function hasErrors(errors: AcademicEducationFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function toPayload(
  values: AcademicEducationFormValues,
  idEgresado: string,
  carreras: Carrera[],
): AcademicEducationPayload {
  const tipoFormacion = values.tipoFormacion;
  if (tipoFormacion !== "Bachiller" && tipoFormacion !== "Carrera") {
    throw new Error("Selecciona un tipo de formación válido.");
  }

  const isCarrera = tipoFormacion === "Carrera";
  const anioFin = values.anioFin.trim();
  const descripcion = values.descripcion.trim();
  const commonPayload = {
    idEgresado,
    tipoFormacion,
    institucion: values.institucion.trim(),
    nivelAcademico: values.nivelAcademico,
    estado: values.actualmenteCursando ? ESTADO_CURSANDO : values.estado,
    anioInicio: Number(values.anioInicio),
    anioFin: values.actualmenteCursando || !anioFin ? null : Number(anioFin),
    ...(descripcion ? { descripcion } : {}),
  };

  if (!isCarrera) {
    return {
      ...commonPayload,
      idCarrera: null,
      titulo: TITULO_BACHILLER,
    };
  }

  const carrera = carreras.find((item) => item.idCarrera === values.idCarrera);
  if (!carrera) throw new Error("Selecciona una carrera válida.");

  return {
    ...commonPayload,
    idCarrera: carrera.idCarrera,
    titulo: carrera.nombre,
  };
}

export function formatPeriod(
  record: Pick<AcademicEducation, "anioInicio" | "anioFin" | "estado">,
): string {
  if (record.anioFin !== null) return `${record.anioInicio} – ${record.anioFin}`;
  return record.estado === ESTADO_CURSANDO
    ? `${record.anioInicio} – Actualidad`
    : `${record.anioInicio}`;
}
