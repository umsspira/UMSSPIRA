// Contrato compartido por el listado, formulario, edición y detalle de experiencia.
export interface ExperienceInput {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  employmentType: string;
  description: string;
}

// El servicio de persistencia agrega un identificador estable a los datos del formulario.
export interface WorkExperience extends ExperienceInput {
  id: string;
}

// Presenta fechas almacenadas como YYYY-MM-DD de forma legible en español.
export function formatExperienceDate(value: string): string {
  if (!value) return "";

  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1);
  return new Intl.DateTimeFormat("es-BO", { month: "short", year: "numeric" })
    .format(date)
    .replace(".", "");
}
