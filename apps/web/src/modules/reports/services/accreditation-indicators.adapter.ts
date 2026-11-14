import { authenticatedFetch } from '@/shared/services/auth-session';
import type { AccreditationIndicators, SalaryRangeCount } from '../types/acreditacion.types';

const SALARY_RANGES = ['0–2.999', '3.000–5.000', '5.001–8.000', '8.001–12.000', '12.001–21.000'];

// El prefijo /api/v1 todavía lo está confirmando Tais.
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
  };
}

export async function loadAccreditationIndicators(
  signal: AbortSignal,
): Promise<AccreditationIndicators> {
  const response = await authenticatedFetch(ENDPOINT, { cache: 'no-store', signal });
  if (!response.ok) throw new Error('No se pudieron cargar los indicadores.');
  return mapAccreditationResponse(await response.json());
}