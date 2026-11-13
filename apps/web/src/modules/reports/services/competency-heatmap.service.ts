import { authenticatedFetch, SessionError } from '@/shared/services/auth-session';
import type {
  HeatmapData,
  HeatmapLoader,
} from '../components/competency-heatmap/heatmap.types';
import {
  HEATMAP_AREAS,
  percentageBand,
} from '../components/competency-heatmap/heatmap.utils';

/**
 * Factoría del cargador HTTP, desacoplada del contrato de T2.1.
 * No decide la ruta, ni la estructura JSON, ni fabrica valores por defecto.
 */
export function createHeatmapHttpLoader(options: {
  endpoint: `/api/v1/${string}`;
  adapt: (json: unknown) => HeatmapData;
}): HeatmapLoader {
  return async (signal) => {
    const response = await authenticatedFetch(options.endpoint, {
      method: 'GET',
      cache: 'no-store',
      signal,
    });
    if (response.status === 401) throw new SessionError(401, 'Su sesión ha expirado');
    if (response.status === 403) throw new Error('Acceso denegado a la carrera solicitada.');
    if (!response.ok) throw new Error('No se pudo consultar el mapa de calor.');
    const payload: unknown = await response.json();
    const data = options.adapt(payload);
    assertHeatmapData(data);
    return data;
  };
}

/** Validación defensiva, sin asumir que el compilador controla las respuestas HTTP. */
export function assertHeatmapData(value: unknown): asserts value is HeatmapData {
  if (!value || typeof value !== 'object') throw new Error('Mapa de calor inválido.');
  const data = value as Partial<HeatmapData>;
  if (data.updatedAt !== null &&
      (typeof data.updatedAt !== 'string' ||
      !/(?:Z|[+-]\d{2}:\d{2})$/.test(data.updatedAt) ||
      Number.isNaN(new Date(data.updatedAt).getTime()))) {
    throw new Error('Fecha de actualización inválida.');
  }
  if (!Array.isArray(data.cohorts)) throw new Error('Cohortes inválidas.');
  if (data.updatedAt === null && data.cohorts.length > 0) {
    throw new Error('Cohortes sin fecha de cálculo válida.');
  }
  const seenYears = new Set<number>();
  for (const cohort of data.cohorts) {
    if (!Number.isInteger(cohort?.year) || cohort.year < 1900 || cohort.year > 2200 || seenYears.has(cohort.year)) {
      throw new Error('Año de cohorte inválido o duplicado.');
    }
    seenYears.add(cohort.year);
    if (!cohort.areas || typeof cohort.areas !== 'object') throw new Error('Áreas de cohorte inválidas.');
    for (const area of HEATMAP_AREAS) {
      const cell = cohort.areas[area];
      if (!cell || !['calculated', 'no-data', 'insufficient'].includes(cell.status)) {
        throw new Error(`Estado inválido en ${cohort.year}/${area}.`);
      }
      if (cell.status === 'calculated') {
        if (!Number.isInteger(cell.graduateCount) || cell.graduateCount < 5) {
          throw new Error('El servidor debe ocultar las muestras de menos de cinco titulados.');
        }
        percentageBand(cell.percentage);
      } else {
        // No se debe permitir filtrar accidentalmente valores sensibles en celdas protegidas.
        if ('percentage' in cell || 'graduateCount' in cell) {
          throw new Error('Una celda no calculada no puede exponer porcentajes ni cantidades.');
        }
      }
    }
  }
}
