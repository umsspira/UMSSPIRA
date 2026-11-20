'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/modules/auth/frontend/services/auth.service';

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
 * Prefijo de la clave donde se guardan los últimos filtros mientras dura la sesión del navegador.
 * Se completa con el id del usuario para que otro usuario de la misma pestaña no los herede.
 */
export const FILTERS_STORAGE_KEY = 'umsspira:accreditation-filters';

export function filtersStorageKey(userId: string): string {
  return `${FILTERS_STORAGE_KEY}:${userId}`;
}

function readSavedQuery(userId: string): string {
  try {
    return window.sessionStorage.getItem(filtersStorageKey(userId)) ?? '';
  } catch {
    return '';
  }
}

function saveQuery(userId: string, query: string): void {
  try {
    if (query) {
      window.sessionStorage.setItem(filtersStorageKey(userId), query);
    } else {
      window.sessionStorage.removeItem(filtersStorageKey(userId));
    }
  } catch {
    // Sin almacenamiento (modo privado): los filtros siguen funcionando con la URL.
  }
}

/**
 * Filtros «Cohorte» y «Semestre» del tablero de acreditación (HU-003).
 * El estado vive en la URL, así se conserva al recargar la página (CA-06)
 * y «Limpiar filtros» vuelve a «Todas» y «Todos» (CA-07).
 * Además se guardan en la sesión del navegador con el id del usuario, así no se pierden
 * al ir a otra sección del portal y volver, y otro usuario de la misma pestaña no los recupera.
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

  const [userId, setUserId] = useState<string | null>(null);
  const restored = useRef(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (active && user?.id) setUserId(user.id);
      })
      .catch(() => {
        // Sin usuario no se guardan ni recuperan filtros; la URL sigue funcionando.
      });
    return () => {
      active = false;
    };
  }, []);

  // Al volver al tablero sin filtros en la URL, se recuperan los últimos de ese usuario.
  useEffect(() => {
    if (!userId || restored.current) return;
    restored.current = true;
    if (hasActiveFilters(filters)) return;
    const saved = readFiltersFromParams(new URLSearchParams(readSavedQuery(userId)));
    if (hasActiveFilters(saved)) replaceFilters(saved);
    // Solo una vez, cuando se conoce el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId || !restored.current) return;
    saveQuery(userId, buildFiltersQuery('', filters));
  }, [userId, filters]);

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