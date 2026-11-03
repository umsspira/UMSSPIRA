'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TechnicalVacancyRequirement } from '@umsspira/shared-types';
import { getTechnicalVacancyRequirements, TechnicalRequirementsError } from '../services/technical-requirements';

export type ConsultationState =
  | { status: 'idle' }
  | { status: 'loading'; vacancyId: string }
  | { status: 'success'; vacancyId: string; requirements: TechnicalVacancyRequirement[] }
  | { status: 'error'; vacancyId: string; message: string; httpStatus?: number };

/** Shared by the ID form and the detail; the phase 1 adapter remains unchanged. */
export function useTechnicalRequirements(initialId?: string) {
  const [state, setState] = useState<ConsultationState>({ status: 'idle' });
  const [validationError, setValidationError] = useState('');
  const request = useRef<AbortController | null>(null);

  const consult = useCallback(async (value: string) => {
    const id = value.trim();
    if (!id) {
      setValidationError('Ingresa el ID de una vacante.');
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setValidationError('');
    setState({ status: 'loading', vacancyId: id });

    try {
      const requirements = await getTechnicalVacancyRequirements(id, controller.signal);
      if (!controller.signal.aborted) setState({ status: 'success', vacancyId: id, requirements });
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setState({
        status: 'error', vacancyId: id,
        message: error instanceof TechnicalRequirementsError
          ? error.message : 'No se pudieron consultar los requisitos técnicos. Intenta nuevamente.',
        httpStatus: error instanceof TechnicalRequirementsError ? error.status : undefined,
      });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, []);

  useEffect(() => {
    if (initialId !== undefined) void consult(initialId);
    return () => request.current?.abort();
  }, [initialId, consult]);

  function reset() {
    request.current?.abort();
    request.current = null;
    setValidationError('');
    setState({ status: 'idle' });
  }

  return { state, validationError, consult, reset };
}
