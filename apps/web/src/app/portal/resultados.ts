export type EstadoNavegador = 'aprobado' | 'pendiente' | 'falla';

export interface ResultadoNavegador {
  navegador: string;
  estado: EstadoNavegador;
}

export const RESULTADOS_NAVEGADORES: ResultadoNavegador[] = [];
