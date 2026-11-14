export const VACANCIES_STORAGE_KEY = 'umsspira-vacantes';

export type Vacancy = {
  id: string | number;
  title: string;
  company: string;
  area: string;
  location: string;
  modality: string;
  description: string;
  requirements: string[];
  conditions?: string;
  createdAt?: string;
  availability?: 'available' | 'unavailable';
  availabilityUpdatedAt?: string;
};

export const VACANCIES_CHANGED_EVENT = 'umsspira-vacancies-changed';

export const DEMO_VACANCIES: Vacancy[] = [
  {
    id: '1',
    title: 'Analista de Datos Junior',
    company: 'Empresa de Tecnología',
    area: 'Datos y Analítica',
    location: 'Cochabamba',
    modality: 'Híbrido',
    description:
      'Buscamos una persona interesada en analizar información, elaborar reportes y apoyar la toma de decisiones mediante el uso de datos.',
    requirements: ['SQL básico', 'Excel', 'Pensamiento analítico'],
    conditions:
      'Jornada completa. Oportunidad de aprendizaje y crecimiento profesional.',
  },
  {
    id: '2',
    title: 'Desarrollador Frontend Junior',
    company: 'Empresa de Software',
    area: 'Desarrollo de Software',
    location: 'Bolivia',
    modality: 'Remoto',
    description:
      'Participarás en el desarrollo de interfaces web, trabajando junto al equipo de diseño y desarrollo para construir experiencias de usuario.',
    requirements: ['JavaScript', 'React', 'Git'],
    conditions: 'Trabajo remoto y colaboración con un equipo de desarrollo.',
  },
  {
    id: '3',
    title: 'Asistente de Soporte TI',
    company: 'Servicios Informáticos',
    area: 'Infraestructura y Soporte',
    location: 'Cochabamba',
    modality: 'Presencial',
    description:
      'Apoyarás en la atención de incidentes técnicos, mantenimiento de equipos y asistencia a usuarios.',
    requirements: ['Windows', 'Redes básicas', 'Atención al usuario'],
    conditions: 'Trabajo presencial. Capacitación inicial incluida.',
  },
];

function isVacancy(value: unknown): value is Vacancy {
  if (typeof value !== 'object' || value === null) return false;

  const vacancy = value as Record<string, unknown>;
  return (
    (typeof vacancy.id === 'string' || typeof vacancy.id === 'number') &&
    typeof vacancy.title === 'string' &&
    typeof vacancy.company === 'string' &&
    typeof vacancy.area === 'string' &&
    typeof vacancy.location === 'string' &&
    typeof vacancy.modality === 'string' &&
    typeof vacancy.description === 'string' &&
    Array.isArray(vacancy.requirements) &&
    vacancy.requirements.every((item) => typeof item === 'string') &&
    (vacancy.conditions === undefined ||
      typeof vacancy.conditions === 'string') &&
    (vacancy.createdAt === undefined ||
      typeof vacancy.createdAt === 'string') &&
    (vacancy.availability === undefined ||
      vacancy.availability === 'available' ||
      vacancy.availability === 'unavailable') &&
    (vacancy.availabilityUpdatedAt === undefined ||
      typeof vacancy.availabilityUpdatedAt === 'string')
  );
}

export function parseSavedVacancies(saved: string | null): Vacancy[] {
  if (!saved) return [];

  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isVacancy)) {
    throw new Error('Las vacantes guardadas tienen un formato no válido.');
  }

  return parsed;
}

export function readSavedVacancies(): Vacancy[] {
  return parseSavedVacancies(localStorage.getItem(VACANCIES_STORAGE_KEY));
}

export function getVacanciesIn(
  savedVacancies: Vacancy[],
  { includeUnavailable = false }: { includeUnavailable?: boolean } = {},
): Vacancy[] {
  const vacanciesById = new Map<string, Vacancy>();
  DEMO_VACANCIES.forEach((vacancy) =>
    vacanciesById.set(String(vacancy.id), vacancy),
  );

  for (const vacancy of savedVacancies) {
    const id = String(vacancy.id);
    vacanciesById.set(id, {
      ...vacanciesById.get(id),
      ...vacancy,
    });
  }

  const vacancies = Array.from(vacanciesById.values());
  return includeUnavailable
    ? vacancies
    : vacancies.filter((vacancy) => vacancy.availability !== 'unavailable');
}

export function readAllVacancies(
  options: { includeUnavailable?: boolean } = {},
): Vacancy[] {
  return getVacanciesIn(readSavedVacancies(), options);
}

export function findVacancyIn(
  id: string,
  savedVacancies: Vacancy[],
  options: { includeUnavailable?: boolean } = {},
): Vacancy | undefined {
  return getVacanciesIn(savedVacancies, options).find(
    (vacancy) => String(vacancy.id) === id,
  );
}

export function findVacancy(
  id: string,
  options: { includeUnavailable?: boolean } = {},
): Vacancy | undefined {
  return findVacancyIn(id, readSavedVacancies(), options);
}

export function updateVacancyAvailability(
  id: string,
  availability: 'available' | 'unavailable',
): Vacancy {
  const savedVacancies = readSavedVacancies();
  const vacancy = findVacancyIn(id, savedVacancies, {
    includeUnavailable: true,
  });

  if (!vacancy) {
    throw new Error('No se encontró la vacante que intentas actualizar.');
  }

  const updatedVacancy: Vacancy = {
    ...vacancy,
    availability,
    availabilityUpdatedAt: new Date().toISOString(),
  };
  const nextSavedVacancies = savedVacancies.filter(
    (savedVacancy) => String(savedVacancy.id) !== id,
  );
  nextSavedVacancies.push(updatedVacancy);
  localStorage.setItem(
    VACANCIES_STORAGE_KEY,
    JSON.stringify(nextSavedVacancies),
  );

  window.dispatchEvent(new Event(VACANCIES_CHANGED_EVENT));
  return updatedVacancy;
}

export function isDemoVacancy(id: string): boolean {
  return DEMO_VACANCIES.some((vacancy) => String(vacancy.id) === id);
}
