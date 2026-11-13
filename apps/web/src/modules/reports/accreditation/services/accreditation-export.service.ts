import { authenticatedFetch } from '@/shared/services/auth-session';
import { readApiError } from '@/shared/services/api-contract';

/** Ruta relativa: pasa por el proxy de la web y conserva el Content-Disposition (como graduates-report-service). */
const ACCREDITATION_EXPORT_PATH = '/api/v1/reports/accreditation';

/** Código que envía la API (T4.1 y T4.2) cuando el periodo no tiene datos. */
export const EMPTY_PERIOD_CODE = 'ACCREDITATION_EMPTY_PERIOD';

export type AccreditationExportFormat = 'pdf' | 'xlsx';

/** Filtros activos del tablero (mismos valores que los selectores de la HU-003). */
export interface AccreditationExportFilters {
  /** Año de la cohorte, por ejemplo «2023». Vacío = «Todas». */
  cohort: string;
  /** Semestre en formato «2/2026». Vacío = «Todos». */
  semester: string;
}

export interface AccreditationExportFile {
  blob: Blob;
  filename: string;
}

export const EXPORT_MESSAGES = {
  exportPdf: 'Exportar PDF',
  exportXlsx: 'Exportar Excel',
  generating: 'Generando…',
  noData: 'No hay información para exportar en este periodo',
  failure: 'No se pudo generar el archivo. Intente nuevamente',
} as const;

/** Error de exportación con el motivo que se muestra al Administrador. */
export class AccreditationExportError extends Error {
  constructor(public readonly reason: 'noData' | 'failure') {
    super(EXPORT_MESSAGES[reason]);
    this.name = 'AccreditationExportError';
  }
}

const MIME_TYPES: Record<AccreditationExportFormat, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * Parámetros de los filtros para el backend (CA-04).
 * Usa los mismos nombres que la URL del tablero; si la T3.1 define otros, se cambian solo aquí.
 */
export function buildExportQuery(filters: AccreditationExportFilters): string {
  const params = new URLSearchParams();
  if (/^\d{4}$/.test(filters.cohort)) params.set('cohorte', filters.cohort);
  if (/^[12]\/\d{4}$/.test(filters.semester)) {
    params.set('semestre', filters.semester.replace('/', '-'));
  }
  return params.toString();
}

export function buildDefaultFilename(
  format: AccreditationExportFormat,
  date: Date = new Date(),
): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `tablero-acreditacion-${yyyy}${mm}${dd}.${format}`;
}

function readFilename(
  contentDisposition: string | null,
  format: AccreditationExportFormat,
): string {
  const match = contentDisposition
    ? /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition)
    : null;
  return match?.[1] ? decodeURIComponent(match[1]) : buildDefaultFilename(format);
}

/**
 * Pide al backend el reporte en PDF (T4.1) o Excel (T4.2):
 * GET /api/v1/reports/accreditation/pdf | /xlsx
 * Un 404 es «noData» solo si la API envía error.code = ACCREDITATION_EMPTY_PERIOD;
 * cualquier otra falla (incluido otro 404) es «failure».
 */
export async function requestAccreditationExport(
  format: AccreditationExportFormat,
  filters: AccreditationExportFilters,
): Promise<AccreditationExportFile> {
  const query = buildExportQuery(filters);
  const url = `${ACCREDITATION_EXPORT_PATH}/${format}${query ? `?${query}` : ''}`;

  let response: Response;
  try {
    response = await authenticatedFetch(url, { method: 'GET' });
  } catch {
    throw new AccreditationExportError('failure');
  }

  if (response.status === 404) {
    const detail = readApiError(await response.json().catch(() => null), '');
    throw new AccreditationExportError(detail.code === EMPTY_PERIOD_CODE ? 'noData' : 'failure');
  }
  if (!response.ok) {
    throw new AccreditationExportError('failure');
  }

  try {
    const blob = await response.blob();
    if (blob.size === 0) throw new AccreditationExportError('failure');
    return {
      blob: blob.type ? blob : new Blob([blob], { type: MIME_TYPES[format] }),
      filename: readFilename(response.headers.get('Content-Disposition'), format),
    };
  } catch (error) {
    if (error instanceof AccreditationExportError) throw error;
    throw new AccreditationExportError('failure');
  }
}

/** Descarga el archivo en el navegador con su nombre. */
export function saveExportFile(file: AccreditationExportFile): void {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Se libera más tarde: algunos navegadores cancelan la descarga si se libera en el acto.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}