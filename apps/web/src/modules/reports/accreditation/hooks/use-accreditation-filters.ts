'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Valor de «Todas» / «Todos» en los filtros: sin filtro aplicado. */
export const ALL = '' as const;

export interface AccreditationFilters {
  /** Año de egreso (cohorte), por ejemplo «2023». Vacío = «Todas». */
  cohort: string;
  /** Semestre en formato «2/2026». Vacío = «Todos». */
  semester: string;
}

/** Nombres de los parámetros en la URL (CA-06). */
export const COHORT_PARAM = 'cohorte';
export const SEMESTER_PARAM = 'semestre';

const COHORT_PATTERN = /^\d{4}$/;
const SEMESTER_PATTERN = /^[12]\/\d{4}$/;
/** En la URL el semestre va como «2-2026» para no codificar la barra. */
const SEMESTER_URL_PATTERN = /^([12])-(\d{4})$/;

export function semesterToUrl(semester: string): string {
  return semester.replace('/', '-');
}

export function semesterFromUrl(value: string | null): string {
  const match = value?.match(SEMESTER_URL_PATTERN);
  return match ? `${match[1]}/${match[2]}` : ALL;
}

export function cohortFromUrl(value: string | null): string {
  return value && COHORT_PATTERN.test(value) ? value : ALL;
}

/** Lee los filtros desde los parámetros de la URL, ignorando valores inválidos. */
export function readFiltersFromParams(
  params: Pick<URLSearchParams, 'get'>,
): AccreditationFilters {
  return {
    cohort: cohortFromUrl(params.get(COHORT_PARAM)),
    semester: semesterFromUrl(params.get(SEMESTER_PARAM)),
  };
}

/** Construye la query string de la URL con los filtros activos. */
export function buildFiltersQuery(
  current: string,
  filters: AccreditationFilters,
): string {
  const params = new URLSearchParams(current);
  if (COHORT_PATTERN.test(filters.cohort)) {
    params.set(COHORT_PARAM, filters.cohort);
  } else {
    params.delete(COHORT_PARAM);
  }
  if (SEMESTER_PATTERN.test(filters.semester)) {
    params.set(SEMESTER_PARAM, semesterToUrl(filters.semester));
  } else {
    params.delete(SEMESTER_PARAM);
  }
  return params.toString();
}

export function hasActiveFilters(filters: AccreditationFilters): boolean {
  return filters.cohort !== ALL || filters.semester !== ALL;
}

/**
 * Filtros «Cohorte» y «Semestre» del tablero de acreditación (HU-003).
 * El estado vive en la URL, así se conserva al recargar la página (CA-06)
 * y «Limpiar filtros» vuelve a «Todas» y «Todos» (CA-07).
 */
export function useAccreditationFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams?.toString() ?? '';

  const filters = useMemo(
    () => readFiltersFromParams(new URLSearchParams(currentQuery)),
    [currentQuery],
  );

  const replaceFilters = useCallback(
    (next: AccreditationFilters) => {
      const query = buildFiltersQuery(currentQuery, next);
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [currentQuery, pathname, router],
  );

  const setCohort = useCallback(
    (cohort: string) => replaceFilters({ ...filters, cohort }),
    [filters, replaceFilters],
  );

  const setSemester = useCallback(
    (semester: string) => replaceFilters({ ...filters, semester }),
    [filters, replaceFilters],
  );

  const clearFilters = useCallback(
    () => replaceFilters({ cohort: ALL, semester: ALL }),
    [replaceFilters],
  );

  return {
    filters,
    setCohort,
    setSemester,
    clearFilters,
    isSemesterActive: filters.semester !== ALL,
    hasActiveFilters: hasActiveFilters(filters),
  };
}