import type { AccreditationPeriod } from '../entities/accreditation-report';

/** Cinco tramos de 20 % del mapa de calor, del menos al más intenso (HU-002 CA-02), iguales a los de la pantalla (T2.2). */
export const HEATMAP_TIERS = ['#FFF0D9', '#FFD09B', '#FFAD61', '#E28E49', '#B65D2B'] as const;
export const HEATMAP_EMPTY = '#E9E7E3';

export function heatmapTier(percent: number): number {
  const bounded = Math.min(Math.max(percent, 0), 100);
  return Math.min(Math.floor(bounded / 20), HEATMAP_TIERS.length - 1);
}

export function heatmapTextColor(percent: number): string {
  return heatmapTier(percent) >= 3 ? '#FFFFFF' : '#1B2632';
}

export function periodLabel(period: AccreditationPeriod): string {
  return (
    'Cohorte: ' +
    (period.cohort === null ? 'Todas' : String(period.cohort)) +
    ' · Semestre: ' +
    (period.semester ?? 'Todos')
  );
}

/**
 * Rango de fechas de envío de un semestre «1/2026» o «2/2026» en hora de Bolivia (UTC-4):
 * el semestre 1 va de enero a junio y el 2 de julio a diciembre (HU-003 CA-04).
 */
export function semesterRange(semester: string): { gte: Date; lt: Date } {
  const [term, year] = semester.split('/').map(Number);
  const startMonth = term === 1 ? 0 : 6;
  return {
    gte: new Date(Date.UTC(year, startMonth, 1, 4)),
    lt: new Date(Date.UTC(term === 1 ? year : year + 1, term === 1 ? 6 : 0, 1, 4)),
  };
}

export function percentLabel(value: number): string {
  return Math.round(value) + ' %';
}

export function monthsLabel(value: number | null): string {
  if (value === null) {
    return 'Sin datos';
  }
  return value.toFixed(1).replace('.', ',') + ' meses';
}

/** Nombre del archivo: acreditacion-<carrera>-<aaaa-mm-dd>.pdf, sin tildes ni espacios. */
export function accreditationFileName(
  careerNames: readonly string[],
  issuedAt: Date,
  extension: string,
): string {
  const career = careerNames.length === 1 ? careerNames[0] : 'varias carreras';
  const slug = career
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return 'acreditacion-' + slug + '-' + issuedAt.toISOString().slice(0, 10) + '.' + extension;
}
