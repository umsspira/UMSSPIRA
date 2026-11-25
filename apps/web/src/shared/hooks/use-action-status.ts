'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** HU10: estados que atraviesa cualquier acción del usuario. */
export type ActionStatus = 'idle' | 'loading' | 'success' | 'error' | 'offline';

export interface RunActionOptions {
  /** true si la acción necesita servidor: sin conexión no se ejecuta (CA-04). */
  requiresConnection?: boolean;
}

interface LastRequest {
  action: () => Promise<unknown>;
  options: RunActionOptions;
}

/**
 * HU10: controla el ciclo de una acción (cargando → éxito / error / sin conexión).
 * - CA-01: pasa a "loading" en el mismo instante del toque y bloquea toques repetidos.
 * - CA-03: si falla guarda el mensaje y permite reintentar la misma acción.
 * - CA-04: sin conexión no ejecuta la acción y marca "offline".
 */
export function useActionStatus() {
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const lastRequest = useRef<LastRequest | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options: RunActionOptions = {}
    ): Promise<T | undefined> => {
      if (busy.current) return undefined;

      lastRequest.current = { action, options };

      if (
        options.requiresConnection &&
        typeof navigator !== 'undefined' &&
        !navigator.onLine
      ) {
        setErrorMessage(null);
        setStatus('offline');
        return undefined;
      }

      busy.current = true;
      setErrorMessage(null);
      setStatus('loading');

      try {
        const result = await action();
        if (mounted.current) setStatus('success');
        return result;
      } catch (error) {
        if (mounted.current) {
          setErrorMessage(error instanceof Error ? error.message : null);
          setStatus('error');
        }
        return undefined;
      } finally {
        busy.current = false;
      }
    },
    []
  );

  const retry = useCallback(async () => {
    const last = lastRequest.current;
    if (!last) return;
    await run(last.action, last.options);
  }, [run]);

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  // Al volver la conexión se quita el aviso "Necesitas conexión…".
  useEffect(() => {
    const handleOnline = () => {
      setStatus((current) => (current === 'offline' ? 'idle' : current));
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return {
    status,
    errorMessage,
    isLoading: status === 'loading',
    run,
    retry,
    reset,
  };
}