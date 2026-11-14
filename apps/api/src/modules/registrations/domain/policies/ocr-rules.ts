import type { OcrFinding, OcrReading, OcrResult } from '@umsspira/shared-types';

export const OCR_RULES_VERSION = 'hu13-1';
export const normalizeOcr = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
const normalizeField = (field: string, value: string) =>
  field === 'ci'
    ? normalizeOcr(value).replace(/\s+(LP|CB|SC|OR|PT|TJ|CH|BE|PD)$/, '')
    : normalizeOcr(value);
const fields = [
  ['nombre', 'Nombres', /^(?:NOMBRES?)\s*[:.-]\s*(.+)$/i],
  ['apellido', 'Apellidos', /^(?:APELLIDOS?)\s*[:.-]\s*(.+)$/i],
  ['ci', 'Cédula de identidad', /^(?:C[. ]?I[.]?|CEDULA(?: DE IDENTIDAD)?)\s*[:.-]\s*(.+)$/i],
  ['carrera', 'Carrera / Programa', /^(?:CARRERA|PROGRAMA|GRADO ACADEMICO)\s*[:.-]\s*(.+)$/i],
  [
    'anio_egreso',
    'Año de egreso',
    /^(?:A[NÑ]O DE EGRESO|GESTION(?: DE EGRESO)?|EGRESO)\s*[:.-]\s*(\d{4})\b/i,
  ],
  ['cod_sis', 'Código SIS', /^(?:CODIGO SIS|SIS|MATRICULA)\s*[:.-]\s*(\d+)\b/i],
] as const;

export function compareOcr(declared: Record<string, unknown>, reading: OcrReading): OcrResult {
  const findings: OcrFinding[] = fields.map(([field, label, pattern]) => {
    const value = String(declared[field] ?? '').trim();
    const normalized = normalizeField(field, value);
    const reliable = reading.lines.filter((line) => line.confidence >= 0.85);
    // Only labelled values can establish a difference. A random year/name elsewhere is not a mismatch.
    const candidates = reliable.flatMap((line) => {
      const original = line.text.normalize('NFC');
      const match = original
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .match(pattern);
      if (!match) {
        return [];
      }
      const offset = match[0].lastIndexOf(match[1]);
      return [{ line, value: original.slice(offset, offset + match[1].length).trim() }];
    });
    const unique = new Set(candidates.map((item) => normalizeField(field, item.value)));
    const candidate = unique.size === 1 ? candidates[0] : undefined;
    const exact = reliable.find((line) => {
      const text = normalizeOcr(line.text);
      return normalized.length > 0 && ` ${text} `.includes(` ${normalized} `);
    });
    // Graduation years must be labelled; signature/issue dates cannot prove graduation.
    const evidence =
      candidate?.line ?? (field === 'anio_egreso' || unique.size > 1 ? undefined : exact);
    const read = candidate?.value ?? evidence?.text ?? null;
    // Preserve literal OCR text even when a name appears within a full-name line.
    const matches = candidate
      ? normalizeField(field, candidate.value) === normalized
      : Boolean(evidence && exact);
    const status =
      !value || !evidence ? 'NO_COMPROBADO' : matches ? 'COINCIDE' : 'POSIBLE_DIFERENCIA';
    return {
      field,
      label,
      declared: value,
      read,
      status,
      evidence: evidence ?? null,
      reason:
        status === 'COINCIDE'
          ? 'Coincidencia con evidencia legible.'
          : status === 'POSIBLE_DIFERENCIA'
            ? 'El valor rotulado difiere del declarado; comprobar el respaldo.'
            : 'Dato ausente, ambiguo o sin confianza suficiente.',
    };
  });
  const insufficient =
    reading.partial ||
    reading.pagesRead !== reading.totalPages ||
    findings.some((f) => f.status === 'NO_COMPROBADO');
  const different = findings.some((f) => f.status === 'POSIBLE_DIFERENCIA');
  const noneMatch = findings.every((f) => f.status === 'POSIBLE_DIFERENCIA');
  return {
    findings,
    suggestion: insufficient
      ? 'REVISION_MANUAL'
      : noneMatch
        ? 'RECHAZAR'
        : different
          ? 'OBSERVAR'
          : 'APROBAR',
    reason: insufficient
      ? 'La evidencia es insuficiente; se requiere revisión manual.'
      : noneMatch
        ? 'Todos los datos se leyeron con confianza y ninguno coincide con el registro.'
        : different
          ? 'Hay diferencias que el administrador debe comprobar.'
          : 'Todos los datos requeridos coinciden con el respaldo.',
    reading,
    rulesVersion: OCR_RULES_VERSION,
  };
}
