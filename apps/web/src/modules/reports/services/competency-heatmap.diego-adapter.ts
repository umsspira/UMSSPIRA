import { AFFINITY_AREAS, RADAR_AREA_IDS, type AffinityArea } from '@umsspira/shared-types';
import type {
  HeatmapCell,
  HeatmapCohort,
  HeatmapData,
} from '../components/competency-heatmap/heatmap.types';
import { createHeatmapHttpLoader } from './competency-heatmap.service';

/**
 * Adaptador de la respuesta observada en la rama de Diego (T2.1).
 *
 * Contrato revisado en la rama T2.1 de Diego: status `ok`, `insufficient`
 * o `no-data`, y `updatedAt` ISO-8601 (null cuando no hay cálculos).
 * El servidor debe omitir percentage y graduateCount en muestras N=1..4.
 * La carga HTTP se activará al montar el mapa en la ruta administrativa real.
 */

const areaById = new Map<string, AffinityArea>(
  AFFINITY_AREAS.map(area => [RADAR_AREA_IDS[area], area]),
);

function object(value: unknown, description: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${description} inválido en la respuesta del mapa.`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, description: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${description} inválidas en la respuesta del mapa.`);
  return value;
}

function readCell(raw: Record<string, unknown>): HeatmapCell {
  const { status, percentage, graduateCount } = raw;
  if (status !== undefined && !['ok', 'calculated', 'no-data', 'insufficient'].includes(status as string)) {
    throw new Error('Estado de celda desconocido en T2.1.');
  }

  if (status === 'insufficient') {
    if (percentage != null || graduateCount != null) {
      throw new Error('T2.1 revela datos de una muestra protegida (CA-06).');
    }
    return { status: 'insufficient' };
  }

  if (status === 'no-data' || (status === undefined && graduateCount === 0)) {
    if (percentage != null || (graduateCount != null && graduateCount !== 0)) {
      throw new Error('Celda sin datos incoherente.');
    }
    return { status: 'no-data' };
  }

  if (!Number.isInteger(graduateCount) || (graduateCount as number) < 0) {
    throw new Error('Conteo de titulados inválido en T2.1.');
  }
  if ((graduateCount as number) < 5) {
    // Importante: rechazar, no transformar silenciosamente; el dato ya cruzó la red.
    throw new Error('T2.1 revela cantidades de 1 a 4 titulados (CA-06).');
  }
  if (typeof percentage !== 'number' || !Number.isFinite(percentage) ||
      percentage < 0 || percentage > 100) {
    throw new Error('Porcentaje inválido en T2.1.');
  }

  return { status: 'calculated', percentage, graduateCount: graduateCount as number };
}

/**
 * Traduce UUIDs reales de Radar a las seis claves institucionales del frontend.
 * `updatedAt` debe ser la fecha del cálculo más reciente pertinente, NO la hora
 * ficticia de renderizado ni una fecha del mockup.
 */
export function adaptDiegoCompetencyHeatmap(payload: unknown): HeatmapData {
  const envelope = object(payload, 'Envoltorio');
  const data = object(envelope.data, 'data');

  const updatedAt = data.updatedAt;
  if (updatedAt !== null &&
      (typeof updatedAt !== 'string' ||
      !/(?:Z|[+-]\d{2}:\d{2})$/.test(updatedAt) ||
      Number.isNaN(new Date(updatedAt).getTime()))) {
    throw new Error('T2.1 no proporciona data.updatedAt válido (CA-07).');
  }

  array(data.areas, 'Áreas');
  const cohorts = array(data.cohorts, 'Cohortes');
  const cells = array(data.cells, 'Celdas');
  if (updatedAt === null && (cohorts.length !== 0 || cells.length !== 0)) {
    throw new Error('T2.1 proporcionó cohortes sin fecha de cálculo (CA-07).');
  }
  const byYear = new Map<number, HeatmapCohort>();

  for (const item of cohorts) {
    // T2.1 devuelve años como strings (por ejemplo "2025").
    if (typeof item !== 'string' || !/^(19|20|21)\d{2}$/.test(item)) {
      throw new Error('Cohorte inválida: se necesita un año de cuatro dígitos.');
    }
    const year = Number(item);
    if (byYear.has(year)) throw new Error('Cohorte repetida en la API.');
    const areas = {} as Record<AffinityArea, HeatmapCell>;
    for (const area of AFFINITY_AREAS) areas[area] = { status: 'no-data' };
    byYear.set(year, { year, areas });
  }

  const seen = new Set<string>();
  for (const item of cells) {
    const raw = object(item, 'Celda');
    if (typeof raw.cohort !== 'string' || !/^(19|20|21)\d{2}$/.test(raw.cohort)) {
      throw new Error('Cohorte de celda inválida.');
    }
    if (typeof raw.areaId !== 'string') throw new Error('UUID de área inválido.');
    const area = areaById.get(raw.areaId);
    if (!area) {
      // Se ignoran áreas extra fuera de las seis oficiales; no alteran el orden.
      continue;
    }
    const year = Number(raw.cohort);
    const cohort = byYear.get(year);
    if (!cohort) throw new Error('Celda asociada a cohorte no declarada.');
    const key = `${year}:${area}`;
    if (seen.has(key)) throw new Error('Celda duplicada en T2.1.');
    seen.add(key);
    cohort.areas[area] = readCell(raw);
  }

  // `Map` conserva el orden de entrada; el contrato visual exige años ascendentes.
  // Array.from evita TS2802 con el target actual del frontend.
  return { updatedAt, cohorts: Array.from(byYear.values()).sort((a, b) => a.year - b.year) };
}

/**
 * Loader preparado para /reports/acreditacion. No modifica el backend ni
 * monta la ruta; la pantalla institucional debe importarlo explícitamente.
 */
export const loadCompetencyHeatmapFromDiego = createHeatmapHttpLoader({
  endpoint: '/api/v1/reports/accreditation/heatmap',
  adapt: adaptDiegoCompetencyHeatmap,
});
