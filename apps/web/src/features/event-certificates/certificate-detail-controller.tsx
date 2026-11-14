'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { authStore } from '@/modules/auth/frontend/store';
import { ApiClientError } from '@/shared/services/api-client';
import { SessionError } from '@/shared/services/auth-session';
import { CertificateFileError } from './certificate-file-service';

import {
  CertificateDetailPage,
  type CertificateDetailState,
} from './certificate-detail-page';

export interface CertificateDocumentData {
  id: string;
  eventName: string;
  participationDate: string;
  pdf: Blob;
}

export type CertificateDetailLoader = (
  certificateId: string,
  signal: AbortSignal,
) => Promise<CertificateDocumentData>;

interface Props {
  certificateId: string;
  loadCertificate?: CertificateDetailLoader;
}

export function CertificateDetailController({
  certificateId,
  loadCertificate,
}: Props) {
  const [state, setState] = useState<CertificateDetailState>(
    loadCertificate ? 'loading' : 'unavailable',
  );

  const [document, setDocument] =
    useState<CertificateDocumentData | undefined>();

  const [retryCount, setRetryCount] = useState(0);
  const sessionRevoked = useRef(false);

  const retry = useCallback(() => {
    if (!sessionRevoked.current) {
      setRetryCount((count) => count + 1);
    }
  }, []);

  useEffect(() => {
    setDocument(undefined);

    if (sessionRevoked.current) {
      setState('unauthenticated');
      return;
    }

    if (!loadCertificate) {
      setState('unavailable');
      return;
    }

    if (!certificateId.trim()) {
      setState('unavailable');
      return;
    }

    const controller = new AbortController();

    const unsubscribe = authStore.subscribe(() => {
      if (authStore.getState().status !== 'idle') return;

      sessionRevoked.current = true;
      controller.abort();
      setDocument(undefined);
      setState('unauthenticated');
    });

    async function load() {
      setState('loading');

      try {
        const result = await loadCertificate!(
          certificateId,
          controller.signal,
        );

        if (controller.signal.aborted || sessionRevoked.current) {
          return;
        }

        if (
          !result ||
          result.id !== certificateId ||
          !result.eventName ||
          !result.participationDate ||
          !(result.pdf instanceof Blob)
        ) {
          throw new Error('Respuesta de certificado inválida');
        }

        setDocument(result);
        setState('available');
      } catch (error) {
        if (controller.signal.aborted || sessionRevoked.current) {
          return;
        }

        setDocument(undefined);

        const status =
          error instanceof ApiClientError ||
          error instanceof SessionError ||
          error instanceof CertificateFileError
            ? error.status
            : undefined;

        if (status === 401) {
          sessionRevoked.current = true;
          setState('unauthenticated');
        } else if (status === 403) {
          setState('forbidden');
        } else if (status === 404) {
          setState('unavailable');
        } else {
          setState('error');
        }
      }
    }

    void load();

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [certificateId, loadCertificate, retryCount]);

  // No mostrar un documento de una navegación anterior.
  const documentMatchesRoute =
    state === 'available' && document?.id === certificateId;

  const visibleState: CertificateDetailState =
    state === 'available' && !documentMatchesRoute
      ? loadCertificate ? 'loading' : 'unavailable'
      : state;

  return (
    <CertificateDetailPage
      state={visibleState}
      document={documentMatchesRoute ? document : undefined}
      onRetry={loadCertificate ? retry : undefined}
    />
  );
}
