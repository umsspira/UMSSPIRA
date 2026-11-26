/**
 * HU08 · Resultado de la prueba E2E por navegador (CA-02).
 * Esto NO se calcula solo: se actualiza a mano después de correr `pnpm exec playwright test` (ver docs/epic8/GuionDemoModoAvion.md).
 * Mientras no se haya corrido, se deja en 'pendiente' para no mostrar una aprobación que no se comprobó.
 */
export type EstadoNavegador = 'aprobado' | 'pendiente' | 'falla';

export interface ResultadoNavegador {
  navegador: string;
  estado: EstadoNavegador;
  /** Fecha de la última corrida, por ejemplo '2026-11-19'. */
  fecha?: string;
}

export const RESULTADOS_NAVEGADORES: ResultadoNavegador[] = [
  { navegador: 'Chrome (escritorio y Android)', estado: 'pendiente' },
  { navegador: 'Firefox (escritorio y móvil)', estado: 'pendiente' },
];
