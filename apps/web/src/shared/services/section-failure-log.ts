export type SectionFailureReason = 'timeout' | 'error' | 'render';

export interface SectionFailureRecord {
  sectionId: string;
  reason: SectionFailureReason;
  message: string;
  at: string;
}

const MAX_RECORDS = 50;
const records: SectionFailureRecord[] = [];

/** HU18 CA-05: deja constancia de qué sección falló y por qué, sin exponer detalles al usuario. */
export function logSectionFailure(
  sectionId: string,
  reason: SectionFailureReason,
  error?: unknown,
): SectionFailureRecord {
  const record: SectionFailureRecord = {
    sectionId,
    reason,
    message: error instanceof Error ? error.message : 'Sin detalle',
    at: new Date().toISOString(),
  };

  records.push(record);
  if (records.length > MAX_RECORDS) records.shift();
  console.warn('[section-failure]', record);

  return record;
}

export function getSectionFailures(): readonly SectionFailureRecord[] {
  return [...records];
}

export function clearSectionFailures(): void {
  records.length = 0;
}