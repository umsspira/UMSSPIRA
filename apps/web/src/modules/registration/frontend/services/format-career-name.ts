// Nombres visibles de las carreras: se reconocen por texto, sin depender de los identificadores.
const CAREER_LABELS = new Map<string, string>([
  ['ingenieria informatica', 'Ingeniería Informática'],
  ['ingenieria en informatica', 'Ingeniería Informática'],
  ['ing informatica', 'Ingeniería Informática'],
  ['ingeniera informatica', 'Ingeniería Informática'],
  ['ingenieria de sistemas', 'Ingeniería de Sistemas'],
]);

function normalizeCareerName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function formatCareerName(name: string): string {
  return CAREER_LABELS.get(normalizeCareerName(name)) ?? name;
}