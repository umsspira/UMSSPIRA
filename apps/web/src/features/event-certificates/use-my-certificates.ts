'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { authStore } from '@/modules/auth/frontend/store';
import { ApiClientError } from '@/shared/services/api-client';
import { SessionError } from '@/shared/services/auth-session';
import type {
  CertificatesView,
  EventCertificate,
} from './certificate-types';

export type CertificateLoader = (
  signal: AbortSignal,
) => Promise<EventCertificate[]>;

interface Options {
  loadCertificates?: CertificateLoader;
}

export function useMyCertificates({
  loadCertificates,
}: Options = {}) {
  const [view, setView] = useState<CertificatesView>({
    status: 'integration-pending',
  });

  const [retryCount, setRetryCount] = useState(0);
  const sessionRevoked = useRef(false);

  const retry = useCallback(() => {
    if (sessionRevoked.current) return;
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    if (sessionRevoked.current) {
      setView({ status: 'unauthenticated' });
      return;
    }

    if (!loadCertificates) {
      setView({ status: 'integration-pending' });
      return;
    }

    const controller = new AbortController();

    const unsubscribe = authStore.subscribe(() => {
      if (authStore.getState().status !== 'idle') return;

      sessionRevoked.current = true;
      controller.abort();
      setView({ status: 'unauthenticated' });
    });

    async function load() {
      if (sessionRevoked.current || controller.signal.aborted) return;

      setView({ status: 'loading' });

      try {
        const certificates = await loadCertificates!(
          controller.signal,
        );

        if (controller.signal.aborted || sessionRevoked.current) return;

        if (!Array.isArray(certificates)) {
          throw new Error('La respuesta del servidor no es válida.');
        }

        setView({
          status: 'success',
          certificates,
        });
      } catch (error) {
        if (controller.signal.aborted || sessionRevoked.current) return;

        const status =
          error instanceof ApiClientError ||
          error instanceof SessionError
            ? error.status
            : undefined;

        if (status === 401) {
          sessionRevoked.current = true;
          setView({ status: 'unauthenticated' });
        } else if (status === 403) {
          setView({ status: 'forbidden' });
        } else {
          setView({
            status: 'error',
            message:
              'No fue posible consultar los certificados. Intenta nuevamente.',
          });
        }
      }
    }

    void load();

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [loadCertificates, retryCount]);

  return { view, retry };
}
