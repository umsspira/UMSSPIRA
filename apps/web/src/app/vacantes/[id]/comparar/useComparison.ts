'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { Skill } from '../../../skills/data';
import {
  compareRequirements,
  parseProfileSkills,
  type ComparedRequirement,
} from '../../comparison-data';
import {
  findVacancyIn,
  parseSavedVacancies,
  type Vacancy,
} from '../../vacancy-data';
import {
  SERVER_STORAGE_SNAPSHOT,
  STORAGE_READ_ERROR_SNAPSHOT,
  readComparisonSnapshot,
  subscribeToLocalStorage,
} from '../../storage';

type ComparisonState = {
  loaded: boolean;
  vacancy: Vacancy | null;
  skills: Skill[];
  requirements: ComparedRequirement[];
  error: string;
};

export function useComparison(id: string): ComparisonState {
  const snapshot = useSyncExternalStore(
    subscribeToLocalStorage,
    readComparisonSnapshot,
    () => SERVER_STORAGE_SNAPSHOT,
  );

  return useMemo(() => {
    if (snapshot === SERVER_STORAGE_SNAPSHOT) {
      return {
        loaded: false,
        vacancy: null,
        skills: [],
        requirements: [],
        error: '',
      };
    }

    if (snapshot === STORAGE_READ_ERROR_SNAPSHOT) {
      return {
        loaded: true,
        vacancy: null,
        skills: [],
        requirements: [],
        error: 'No se pudo acceder al almacenamiento local del navegador.',
      };
    }

    try {
      const parsedSnapshot: unknown = JSON.parse(snapshot);
      if (
        !Array.isArray(parsedSnapshot) ||
        parsedSnapshot.length !== 2 ||
        !(typeof parsedSnapshot[0] === 'string' || parsedSnapshot[0] === null) ||
        !(typeof parsedSnapshot[1] === 'string' || parsedSnapshot[1] === null)
      ) {
        throw new Error('No se pudieron leer los datos locales del perfil.');
      }

      const vacancy = findVacancyIn(
        id,
        parseSavedVacancies(parsedSnapshot[0]),
      );
      if (!vacancy) {
        return {
          loaded: true,
          vacancy: null,
          skills: [],
          requirements: [],
          error: '',
        };
      }

      const skills = parseProfileSkills(parsedSnapshot[1]);
      return {
        loaded: true,
        vacancy,
        skills,
        requirements: compareRequirements(vacancy, skills),
        error: '',
      };
    } catch (error) {
      return {
        loaded: true,
        vacancy: null,
        skills: [],
        requirements: [],
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los datos para la comparación.',
      };
    }
  }, [id, snapshot]);
}
