
/** Filtros del tablero de acreditación (HU-003). Los comparten el tablero, el mapa y las exportaciones. */
export interface AccreditationFilter {
  careerId?: string;
  cohort?: number;
  /** Semestre con el formato 2/2026. */
  semester?: string;
}

/** Zona horaria de las fechas de envío (Bolivia, UTC-4). */
const BOLIVIA_TIME_ZONE = 'America/La_Paz';

export type AccreditationFilters = AccreditationFilter;

export interface AccreditationFilterQuery {
  careerId?: string;
  cohorte?: number;
  cohort?: number;
  semestre?: string;
  semester?: string;
}

/**
 * Calcula el semestre académico ('1/AAAA' o '2/AAAA') en horario de Bolivia
 * a partir de una fecha de envío de encuesta (HU-003, CA-02).
 * Semestre 1: enero a junio (meses 1 a 6)
 * Semestre 2: julio a diciembre (meses 7 a 12)
 */
export function getSemesterFromDate(date: Date): string {
  const boliviaDateStr = date.toLocaleDateString('en-CA', { timeZone: BOLIVIA_TIME_ZONE });
  const [yearStr, monthStr] = boliviaDateStr.split('-');
  const month = parseInt(monthStr, 10);
  const term = month <= 6 ? 1 : 2;
  return `${term}/${yearStr}`;
}

/**
 * Parsea y normaliza un semestre en formato '1/AAAA', '2/AAAA', '1-AAAA' o '2-AAAA'.
 * Retorna siempre en formato canónico '1/AAAA' o '2/AAAA'.
 */
export function parseSemester(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const match = value.trim().match(/^([12])[/-](\d{4})$/);
  if (!match) {
    return undefined;
  }
  return `${match[1]}/${match[2]}`;
}

/**
 * Extrae los filtros normalizados de cohorte y semestre a partir de la query del endpoint.
 */
export function extractAccreditationFilters(
  query: AccreditationFilterQuery,
): AccreditationFilters | undefined {
  const cohort = query.cohorte ?? query.cohort;
  const rawSemester = query.semestre ?? query.semester;
  const semester = parseSemester(rawSemester);

  if (cohort === undefined && semester === undefined) {
    return undefined;
  }

  return {
    ...(cohort !== undefined ? { cohort } : {}),
    ...(semester !== undefined ? { semester } : {}),
  };
}
