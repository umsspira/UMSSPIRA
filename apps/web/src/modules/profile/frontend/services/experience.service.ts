import type { ExperienceInput, WorkExperience } from "../types/experience";

const STORAGE_KEY = "umssinspira:experiencia-laboral";

function isWorkExperience(value: unknown): value is WorkExperience {
  if (typeof value !== "object" || value === null) return false;

  const experience = value as Partial<WorkExperience>;
  return (
    typeof experience.id === "string" &&
    typeof experience.company === "string" &&
    typeof experience.position === "string" &&
    typeof experience.startDate === "string" &&
    typeof experience.endDate === "string" &&
    typeof experience.currentlyWorking === "boolean" &&
    typeof experience.employmentType === "string" &&
    typeof experience.description === "string"
  );
}

function readExperiences(): WorkExperience[] {
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error("No se pudo acceder a las experiencias guardadas en este navegador.");
  }

  if (stored === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("No se pudieron leer las experiencias guardadas en este navegador.");
  }

  if (!Array.isArray(parsed) || !parsed.every(isWorkExperience)) {
    throw new Error("Los datos de experiencia laboral guardados no tienen un formato válido.");
  }

  return parsed;
}

function writeExperiences(experiences: WorkExperience[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(experiences));
  } catch {
    throw new Error("No se pudieron guardar los cambios en este navegador.");
  }
}

function validateExperience(input: ExperienceInput): ExperienceInput {
  const company = input.company.trim();
  const position = input.position.trim();
  const description = input.description.trim();
  const employmentType = input.employmentType.trim();

  if (!company || !position || !description || !employmentType || !input.startDate) {
    throw new Error("Completa todos los campos obligatorios de la experiencia.");
  }

  if (!input.currentlyWorking && !input.endDate) {
    throw new Error("Indica la fecha de finalización o marca que el empleo continúa.");
  }

  if (input.currentlyWorking && input.endDate) {
    throw new Error("La fecha de finalización debe estar vacía si el empleo continúa.");
  }

  if (input.endDate && input.endDate < input.startDate) {
    throw new Error("La fecha de finalización no puede ser anterior a la fecha de inicio.");
  }

  return {
    ...input,
    company,
    position,
    description,
    employmentType,
    endDate: input.currentlyWorking ? "" : input.endDate,
  };
}

function createId(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Este navegador no permite generar un identificador seguro para la experiencia.");
  }
  return globalThis.crypto.randomUUID();
}

export async function getExperiences(): Promise<WorkExperience[]> {
  return readExperiences().sort((left, right) =>
    right.startDate.localeCompare(left.startDate),
  );
}

export async function getExperience(id: string): Promise<WorkExperience> {
  const experience = readExperiences().find((item) => item.id === id);
  if (!experience) throw new Error("No se encontró la experiencia laboral.");
  return experience;
}

export async function createExperience(input: ExperienceInput): Promise<WorkExperience> {
  const experience: WorkExperience = {
    ...validateExperience(input),
    id: createId(),
  };
  writeExperiences([...readExperiences(), experience]);
  return experience;
}

export async function updateExperience(
  id: string,
  input: ExperienceInput,
): Promise<WorkExperience> {
  const experiences = readExperiences();
  if (!experiences.some((item) => item.id === id)) {
    throw new Error("No se encontró la experiencia laboral.");
  }

  const updated: WorkExperience = {
    ...validateExperience(input),
    id,
  };
  writeExperiences(experiences.map((item) => (item.id === id ? updated : item)));
  return updated;
}

export async function deleteExperience(id: string): Promise<void> {
  const experiences = readExperiences();
  if (!experiences.some((item) => item.id === id)) {
    throw new Error("No se encontró la experiencia laboral.");
  }
  writeExperiences(experiences.filter((item) => item.id !== id));
}
