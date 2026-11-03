/** Presentation fields only. The team must map the official listing contract later. */
export type VacancyListItem = {
  id: string;
  titulo: string;
  empresa: string;
  area?: string;
  modalidad?: string;
  ubicacion?: string;
  descripcion?: string;
  fechaPublicacion?: string | null;
  fechaRegistro?: string | null;
};

export type VacancyFilterField = 'area' | 'modalidad' | 'ubicacion';
export type VacancyFilters = Record<VacancyFilterField | 'query', string>;
export type VacancySort = 'recent' | 'oldest';
export const EMPTY_FILTERS: VacancyFilters = { query: '', area: '', modalidad: '', ubicacion: '' };

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function filterVacancies(vacancies: readonly VacancyListItem[], filters: VacancyFilters) {
  const query = normalize(filters.query);
  return vacancies.filter((vacancy) =>
    (!query || normalize(vacancy.titulo).includes(query) || normalize(vacancy.empresa).includes(query)) &&
    (['area', 'modalidad', 'ubicacion'] as const).every((field) =>
      !filters[field] || normalize(vacancy[field] ?? '') === normalize(filters[field])));
}

export function filterOptions(vacancies: readonly VacancyListItem[], field: VacancyFilterField, selected: string) {
  const options = new Map<string, string>();
  for (const vacancy of vacancies) {
    const label = vacancy[field]?.trim();
    if (label && !options.has(normalize(label))) options.set(normalize(label), label);
  }
  if (selected) options.set(normalize(selected), selected);
  return Array.from(options.values()).sort((a, b) => a.localeCompare(b, 'es'));
}

function timestamp(value?: string | null) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? null : parsed;
}

export function sortVacancies(vacancies: readonly VacancyListItem[], order: VacancySort) {
  return [...vacancies].sort((a, b) => {
    const left = timestamp(a.fechaPublicacion ?? a.fechaRegistro);
    const right = timestamp(b.fechaPublicacion ?? b.fechaRegistro);
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return order === 'recent' ? right - left : left - right;
  });
}

export function publicationDate(value?: string | null) {
  if (timestamp(value) === null) return { label: 'No disponible', dateTime: undefined };
  const date = new Date(value!);
  return {
    label: new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/La_Paz' }).format(date),
    dateTime: date.toISOString(),
  };
}
