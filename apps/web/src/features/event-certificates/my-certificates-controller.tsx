'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { authStore } from '@/modules/auth/frontend/store';
import { SessionError } from '@/shared/services/auth-session';

import {
  CertificateFileError,
  downloadCertificatePdf,
  fetchCertificatePdf,
} from './certificate-file-service';

import { MyCertificatesPage } from './my-certificates-page';
import type { CertificatesView } from './certificate-types';

import {
  useMyCertificates,
  type CertificateLoader,
} from './use-my-certificates';

interface Props {
  loadCertificates?: CertificateLoader;
  resolvePdfEndpoint?: (certificateId: string) => string;
}

export function MyCertificatesController({
  loadCertificates,
  resolvePdfEndpoint,
}: Props) {
  const { view, retry } = useMyCertificates({
    loadCertificates,
  });

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [accessView, setAccessView] = useState<CertificatesView | null>(null);

  const activeDownload = useRef<AbortController | null>(null);

  useEffect(() => {
    const unsubscribe = authStore.subscribe(() => {
      if (authStore.getState().status !== 'idle') return;

      activeDownload.current?.abort();
      activeDownload.current = null;
      setDownloadingId(null);
      setDownloadError(null);
      setAccessView({ status: 'unauthenticated' });
    });

    return () => {
      activeDownload.current?.abort();
      unsubscribe();
    };
  }, []);

  const currentView =
    view.status === 'unauthenticated' ? view : accessView ?? view;

  const handleDownload = useCallback(
    async (certificateId: string) => {
      if (
        !resolvePdfEndpoint ||
        view.status !== 'success' ||
        accessView !== null ||
        activeDownload.current
      ) {
        return;
      }

      const belongsToList = view.certificates.some(
        (certificate) => certificate.id === certificateId,
      );

      if (!belongsToList) return;

      const controller = new AbortController();
      activeDownload.current = controller;
      setDownloadingId(certificateId);
      setDownloadError(null);

      try {
        const endpoint = resolvePdfEndpoint(certificateId);
        const pdf = await fetchCertificatePdf(
          endpoint,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        downloadCertificatePdf(pdf, certificateId);
      } catch (error) {
        if (controller.signal.aborted) return;

        const status =
          error instanceof CertificateFileError ||
          error instanceof SessionError
            ? error.status
            : undefined;

        if (status === 401) {
          setAccessView({ status: 'unauthenticated' });
        } else if (status === 403) {
          setAccessView({ status: 'forbidden' });
        } else {
          setDownloadError(
            'No se pudo descargar el certificado. Intenta nuevamente.',
          );
        }
      } finally {
        if (activeDownload.current === controller) {
          activeDownload.current = null;
          setDownloadingId(null);
        }
      }
    },
    [resolvePdfEndpoint, view, accessView],
  );

  return (
    <MyCertificatesPage
      view={currentView}
      onRetry={currentView.status === 'error' ? retry : undefined}
      onDownload={
        resolvePdfEndpoint && loadCertificates &&
        currentView.status === 'success'
          ? handleDownload
          : undefined
      }
      downloadingId={downloadingId}
      downloadError={downloadError}
    />
  );
}
