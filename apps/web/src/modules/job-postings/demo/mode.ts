export const DEMO_SCENARIOS = [
  { value: 'listado', label: 'Listado' },
  { value: 'oportunidades', label: 'Oportunidades para ti' },
  { value: 'carga', label: 'Carga' },
  { value: 'error', label: 'Error y reintento' },
  { value: 'inexistente', label: 'Vacante inexistente' },
  { value: 'sin-vacantes', label: 'Listado vacío' },
  { value: 'sin-requisitos', label: 'Sin competencias' },
  { value: 'perfil-incompleto', label: 'Perfil incompleto' },
  { value: 'error-nlp', label: 'Error de NLP' },
  { value: 'actualizado', label: 'Listado actualizado' },
] as const;

export type DemoScenario = typeof DEMO_SCENARIOS[number]['value'];
export type ModeSearchParams = {
  hu8Demo?: string | string[];
  hu9Demo?: string | string[];
  tab?: string;
  view?: string;
};

export function resolveDemoScenario(value: string | string[] | null | undefined): DemoScenario | null {
  if (Array.isArray(value)) return null;
  return DEMO_SCENARIOS.find((scenario) => scenario.value === value)?.value ?? null;
}

export function demoHref(path: string, scenario: DemoScenario) {
  return `${path}?${new URLSearchParams({ hu8Demo: scenario })}`;
}

export function scenarioHref(path: string, scenario: DemoScenario) {
  if (scenario === 'sin-vacantes' || scenario === 'actualizado') return demoHref('/job-postings', scenario);
  if (scenario === 'inexistente' && path === '/job-postings') return demoHref('/job-postings/vacante-inexistente', scenario);
  return demoHref(path, scenario);
}
