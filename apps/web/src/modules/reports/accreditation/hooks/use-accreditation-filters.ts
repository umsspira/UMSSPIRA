'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/modules/auth/frontend/services/auth.service';
import { isCareerId } from '../services/accreditation-export.service';

/** Valor de «Todas» / «Todos» en los filtros: sin filtro aplicado. */
export const ALL = '' as const;

export interface AccreditationFilters {
  /** Año de egreso (cohorte), por ejemplo «2023». Vacío = «Todas». */
  cohort: string;
  /** Semestre en formato «2/2026». Vacío = «Todos». */
  semester: string;
  /** Carrera elegida (id) cuando el administrador tiene varias. Sin valor = sin elegir. */
  career?: string;
}

/** Nombres de los parámetros en la URL (CA-06). */
export const COHORT_PARAM = 'cohorte';
export const SEMESTER_PARAM = 'semestre';
export const CAREER_PARAM = 'carrera';

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

export function careerFromUrl(value: string | null): string {
  return value && isCareerId(value) ? value.toLowerCase() : ALL;
}

export function cohortFromUrl(value: string | null): string {
  return value && COHORT_PATTERN.test(value) ? value : ALL;
}

/** Lee los filtros desde los parámetros de la URL, ignorando valores inválidos. */
export function readFiltersFromParams(
  params: Pick<URLSearchParams, 'get'>,
): AccreditationFilters {
  const filters: AccreditationFilters = {
    cohort: cohortFromUrl(params.get(COHORT_PARAM)),
    semester: semesterFromUrl(params.get(SEMESTER_PARAM)),
  };
  const career = careerFromUrl(params.get(CAREER_PARAM));
  return career ? { ...filters, career } : filters;
}

/** Construye la query string de la URL con los filtros activos. */
export function buildFiltersQuery(
  current: string,
  filters: AccreditationFilters,
): string {
  const params = new URLSearchParams(current);
  if (isCareerId(filters.career)) {
    params.set(CAREER_PARAM, filters.career);
  } else {
    params.delete(CAREER_PARAM);
  }
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
    if (hasActiveFilters(filters) || filters.career) return;
    const saved = readFiltersFromParams(new URLSearchParams(readSavedQuery(userId)));
    if (hasActiveFilters(saved) || saved.career) replaceFilters(saved);
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

  // Al cambiar de carrera se reinician cohorte y semestre: cada carrera tiene sus propias opciones.
  const setCareer = useCallback(
    (career: string) => replaceFilters({ cohort: ALL, semester: ALL, career }),
    [replaceFilters],
  );

  // «Limpiar filtros» vuelve a «Todas» y «Todos» sin cambiar la carrera elegida (CA-07).
  const clearFilters = useCallback(
    () => replaceFilters({ cohort: ALL, semester: ALL, career: filters.career }),
    [filters.career, replaceFilters],
  );

  return {
    filters,
    setCohort,
    setSemester,
    setCareer,
    clearFilters,
    isSemesterActive: filters.semester !== ALL,
    hasActiveFilters: hasActiveFilters(filters),
  };
}