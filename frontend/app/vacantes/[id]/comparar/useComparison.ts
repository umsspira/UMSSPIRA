'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Skill } from '../../../skills/data';
import {
  getVacancy,
  type Vacancy as ApiVacancy,
} from '../../../../lib/api/vacantes';
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

function mapApiVacancy(vacancy: ApiVacancy): Vacancy {
  return {
    id: vacancy.id,
    title: vacancy.titulo,
    company: vacancy.empresa,
    area: vacancy.area,
    location: vacancy.ubicacion,
    modality: vacancy.modalidad,
    description: vacancy.descripcion,
    requirements: vacancy.requisitos.map((requirement) => requirement.nombre),
    conditions: vacancy.condiciones,
  };
}

export function useComparison(id: string): ComparisonState {
  const snapshot = useSyncExternalStore(
    subscribeToLocalStorage,
    readComparisonSnapshot,
    () => SERVER_STORAGE_SNAPSHOT,
  );
  const localState = useMemo(() => {
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

  const [remoteResult, setRemoteResult] = useState<{
    id: string;
    vacancy: Vacancy | null;
    error: string;
  } | null>(null);

  useEffect(() => {
    if (!localState.loaded || localState.vacancy || localState.error) return;

    let active = true;

    getVacancy(id)
      .then((result) => {
        if (!active) return;
        setRemoteResult({
        id,
        vacancy: mapApiVacancy(result),
        error: '',
        });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setRemoteResult({
        id,
        vacancy: null,
        error:
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar la vacante para la comparación.',
        });
      });

    return () => {
      active = false;
    };
  }, [id, localState.error, localState.loaded, localState.vacancy]);

  const currentRemoteResult =
    remoteResult?.id === id ? remoteResult : null;
  if (localState.vacancy || localState.error) return localState;

  if (!currentRemoteResult) {
    return {
      ...localState,
      loaded: false,
    };
  }

  if (currentRemoteResult.error || !currentRemoteResult.vacancy) {
    return {
      ...localState,
      loaded: true,
      error: currentRemoteResult.error,
    };
  }

  return {
    ...localState,
    loaded: true,
    vacancy: currentRemoteResult.vacancy,
    requirements: compareRequirements(
      currentRemoteResult.vacancy,
      localState.skills,
    ),
  };
}
