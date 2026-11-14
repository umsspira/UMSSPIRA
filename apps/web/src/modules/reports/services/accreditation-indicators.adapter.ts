import { authenticatedFetch, SessionError } from '@/shared/services/auth-session';
import type { CohortEmployabilityData } from '../accreditation/components/cohort-employability-chart';
import {
  buildExportQuery,
  type AccreditationExportFilters,
} from '../accreditation/services/accreditation-export.service';
import type { AccreditationIndicators, SalaryRangeCount } from '../types/acreditacion.types';

const SALARY_RANGES = ['0–2.999', '3.000–5.000', '5.001–8.000', '8.001–12.000', '12.001–21.000'];

const ENDPOINT = '/api/v1/reports/accreditation';

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toSalaryRanges(raw: unknown): SalaryRangeCount[] {
  const counts = new Map<string, number>();
  if (Array.isArray(raw)) {
    for (const item of raw as Array<Record<string, unknown>>) {
      if (typeof item?.range === 'string') counts.set(item.range, toNumber(item.count));
    }
  } else if (typeof raw === 'object' && raw !== null) {
    for (const [range, count] of Object.entries(raw as Record<string, unknown>)) {
      counts.set(range, toNumber(count));
    }
  }
  return SALARY_RANGES.map((range) => ({ range, count: counts.get(range) ?? 0 }));
}

/**
 * Cohortes del endpoint al formato del gráfico de la T1.4. Las cohortes con 1 a 4 respuestas
 * llegan sin cantidades («insufficient»): se envían con 0 respuestas para que el gráfico
 * muestre «Sin datos suficientes» sin revelar la cantidad.
 */
function toCohorts(raw: unknown): CohortEmployabilityData[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Array<Record<string, unknown>>)
    .filter((item) => Number.isInteger(item?.cohort))
    .map((item) =>
      item.status === 'ok'
        ? {
            cohort: item.cohort as number,
            responses: toNumber(item.totalResponses),
            employed: toNumber(item.employedGraduates),
          }
        : { cohort: item.cohort as number, responses: 0, employed: 0 },
    );
}

function toTextList(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((item) => typeof item === 'number' || typeof item === 'string').map(String)
    : [];
}

export function mapAccreditationResponse(body: unknown): AccreditationIndicators {
  const data = (typeof body === 'object' && body !== null && 'data' in body
    ? (body as { data?: Record<string, unknown> }).data
    : undefined) ?? {};

  const months = data.averageInsertionMonths;
  return {
    totalResponses: toNumber(data.totalResponses),
    employedGraduates: toNumber(data.employedGraduates),
    employedPercent: toNumber(data.employedPercentage),
    averageInsertionMonths: months === null || months === undefined ? null : toNumber(months),
    salaryRanges: toSalaryRanges(data.salaryRanges),
    cohorts: toCohorts(data.employabilityByCohort),
    availableCohorts: toTextList(data.availableCohorts),
    availableSemesters: toTextList(data.availableSemesters),
  };
}

/** Indicadores con los filtros aplicados: ?cohorte=2023&semestre=1-2026 (T3.1). */
export async function loadAccreditationIndicators(
  signal: AbortSignal,
  filters: AccreditationExportFilters = { cohort: '', semester: '' },
): Promise<AccreditationIndicators> {
  const query = buildExportQuery(filters);
  const response = await authenticatedFetch(query ? `${ENDPOINT}?${query}` : ENDPOINT, {
    cache: 'no-store',
    signal,
  });
  if (response.status === 401) throw new SessionError(401, 'Su sesión ha expirado');
  if (!response.ok) throw new Error('No se pudieron cargar los indicadores.');
  return mapAccreditationResponse(await response.json());
}