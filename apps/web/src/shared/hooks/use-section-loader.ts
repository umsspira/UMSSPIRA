'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { logSectionFailure } from '@/shared/services/section-failure-log';
import { SECTION_TIMEOUT_MS, SectionTimeoutError, withTimeout } from '@/shared/utils/with-timeout';

export type SectionState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'unavailable'; timedOut: boolean };

/**
 * HU18: carga los datos de una sección con límite de tiempo (8 s) y permite
 * reintentar solo esa sección. Un fallo no afecta a las demás secciones.
 */
export function useSectionLoader<T>(
  sectionId: string,
  loader: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = SECTION_TIMEOUT_MS,
) {
  const [state, setState] = useState<SectionState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    withTimeout((signal) => loaderRef.current(signal), timeoutMs).then(
      (data) => {
        if (active) setState({ status: 'ready', data });
      },
      (error: unknown) => {
        if (!active) return;
        const timedOut = error instanceof SectionTimeoutError;
        logSectionFailure(sectionId, timedOut ? 'timeout' : 'error', error);
        setState({ status: 'unavailable', timedOut });
      },
    );

    return () => {
      active = false;
    };
  }, [sectionId, timeoutMs, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { state, retry };
}